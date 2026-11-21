package metrics

import (
	"bytes"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// MetricType matches Prometheus exposition types.
type MetricType string

const (
	TypeCounter   MetricType = "counter"
	TypeGauge     MetricType = "gauge"
	TypeHistogram MetricType = "histogram"
)

// Sample represents a single gauge/counter observation emitted by dynamic collectors.
type Sample struct {
	Name   string
	Help   string
	Type   MetricType
	Labels map[string]string
	Value  float64
}

// Registry is a lightweight, zero-dependency Prometheus text-format (0.0.4) registry.
type Registry struct {
	mu         sync.RWMutex
	counters   map[string]*Counter
	gauges     map[string]*Gauge
	histograms map[string]*Histogram
	collectors []func() []Sample
}

// NewRegistry creates an empty metric registry.
func NewRegistry() *Registry {
	return &Registry{
		counters:   make(map[string]*Counter),
		gauges:     make(map[string]*Gauge),
		histograms: make(map[string]*Histogram),
	}
}

// RegisterCollector registers a synchronous callback evaluated at scrape time.
func (r *Registry) RegisterCollector(fn func() []Sample) {
	if r == nil || fn == nil {
		return
	}
	r.mu.Lock()
	r.collectors = append(r.collectors, fn)
	r.mu.Unlock()
}

// Counter tracks monotonically increasing values keyed by fixed label names.
type Counter struct {
	name       string
	help       string
	labelNames []string
	mu         sync.Mutex
	series     map[string]*counterSeries
}

type counterSeries struct {
	labels []string
	value  float64
}

// NewCounter registers and returns a Counter metric.
func (r *Registry) NewCounter(name, help string, labelNames ...string) *Counter {
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.counters[name]; ok {
		return existing
	}
	c := &Counter{
		name:       name,
		help:       help,
		labelNames: append([]string(nil), labelNames...),
		series:     make(map[string]*counterSeries),
	}
	r.counters[name] = c
	return c
}

// Inc increments the counter by 1 for the provided label values.
func (c *Counter) Inc(labelValues ...string) {
	c.Add(1, labelValues...)
}

// Add adds v (>= 0) to the counter for the provided label values.
func (c *Counter) Add(v float64, labelValues ...string) {
	if c == nil || v < 0 {
		return
	}
	vals := normalizeLabels(c.labelNames, labelValues)
	key := seriesKey(vals)
	c.mu.Lock()
	s, ok := c.series[key]
	if !ok {
		s = &counterSeries{labels: vals}
		c.series[key] = s
	}
	s.value += v
	c.mu.Unlock()
}

// Gauge tracks arbitrary numeric levels that can increase or decrease.
type Gauge struct {
	name       string
	help       string
	labelNames []string
	mu         sync.Mutex
	series     map[string]*gaugeSeries
}

type gaugeSeries struct {
	labels []string
	value  float64
}

// NewGauge registers and returns a Gauge metric.
func (r *Registry) NewGauge(name, help string, labelNames ...string) *Gauge {
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.gauges[name]; ok {
		return existing
	}
	g := &Gauge{
		name:       name,
		help:       help,
		labelNames: append([]string(nil), labelNames...),
		series:     make(map[string]*gaugeSeries),
	}
	r.gauges[name] = g
	return g
}

// Set sets the gauge value for the provided label values.
func (g *Gauge) Set(v float64, labelValues ...string) {
	if g == nil {
		return
	}
	vals := normalizeLabels(g.labelNames, labelValues)
	key := seriesKey(vals)
	g.mu.Lock()
	s, ok := g.series[key]
	if !ok {
		s = &gaugeSeries{labels: vals}
		g.series[key] = s
	}
	s.value = v
	g.mu.Unlock()
}

// Inc increments the gauge by 1.
func (g *Gauge) Inc(labelValues ...string) { g.Add(1, labelValues...) }

// Dec decrements the gauge by 1.
func (g *Gauge) Dec(labelValues ...string) { g.Add(-1, labelValues...) }

// Add adjusts the gauge by delta.
func (g *Gauge) Add(delta float64, labelValues ...string) {
	if g == nil {
		return
	}
	vals := normalizeLabels(g.labelNames, labelValues)
	key := seriesKey(vals)
	g.mu.Lock()
	s, ok := g.series[key]
	if !ok {
		s = &gaugeSeries{labels: vals}
		g.series[key] = s
	}
	s.value += delta
	g.mu.Unlock()
}

// Histogram tracks value distributions across sorted cumulative buckets.
type Histogram struct {
	name       string
	help       string
	buckets    []float64
	labelNames []string
	mu         sync.Mutex
	series     map[string]*histSeries
}

type histSeries struct {
	labels []string
	counts []uint64
	sum    float64
	total  uint64
}

// NewHistogram registers and returns a Histogram metric.
func (r *Registry) NewHistogram(name, help string, buckets []float64, labelNames ...string) *Histogram {
	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.histograms[name]; ok {
		return existing
	}
	b := append([]float64(nil), buckets...)
	sort.Float64s(b)
	h := &Histogram{
		name:       name,
		help:       help,
		buckets:    b,
		labelNames: append([]string(nil), labelNames...),
		series:     make(map[string]*histSeries),
	}
	r.histograms[name] = h
	return h
}

// Observe records v into the appropriate histogram buckets.
func (h *Histogram) Observe(v float64, labelValues ...string) {
	if h == nil {
		return
	}
	vals := normalizeLabels(h.labelNames, labelValues)
	key := seriesKey(vals)
	h.mu.Lock()
	s, ok := h.series[key]
	if !ok {
		s = &histSeries{
			labels: vals,
			counts: make([]uint64, len(h.buckets)),
		}
		h.series[key] = s
	}
	for i, bound := range h.buckets {
		if v <= bound {
			s.counts[i]++
		}
	}
	s.sum += v
	s.total++
	h.mu.Unlock()
}

// Render returns the Prometheus 0.0.4 text exposition representation.
func (r *Registry) Render() string {
	var buf bytes.Buffer
	_ = r.WritePrometheus(&buf)
	return buf.String()
}

// WritePrometheus writes all registered metrics and collector samples to w.
func (r *Registry) WritePrometheus(w io.Writer) error {
	if r == nil {
		return nil
	}

	r.mu.RLock()
	counterNames := make([]string, 0, len(r.counters))
	for k := range r.counters {
		counterNames = append(counterNames, k)
	}
	gaugeNames := make([]string, 0, len(r.gauges))
	for k := range r.gauges {
		gaugeNames = append(gaugeNames, k)
	}
	histNames := make([]string, 0, len(r.histograms))
	for k := range r.histograms {
		histNames = append(histNames, k)
	}
	collectors := append([]func() []Sample(nil), r.collectors...)
	r.mu.RUnlock()

	sort.Strings(counterNames)
	sort.Strings(gaugeNames)
	sort.Strings(histNames)

	for _, name := range counterNames {
		r.mu.RLock()
		c := r.counters[name]
		r.mu.RUnlock()
		c.writeTo(w)
	}
	for _, name := range gaugeNames {
		r.mu.RLock()
		g := r.gauges[name]
		r.mu.RUnlock()
		g.writeTo(w)
	}
	for _, name := range histNames {
		r.mu.RLock()
		h := r.histograms[name]
		r.mu.RUnlock()
		h.writeTo(w)
	}

	if len(collectors) > 0 {
		grouped := make(map[string][]Sample)
		var sampleNames []string
		for _, fn := range collectors {
			for _, smp := range fn() {
				if smp.Name == "" {
					continue
				}
				if _, exists := grouped[smp.Name]; !exists {
					sampleNames = append(sampleNames, smp.Name)
				}
				grouped[smp.Name] = append(grouped[smp.Name], smp)
			}
		}
		sort.Strings(sampleNames)
		for _, name := range sampleNames {
			samples := grouped[name]
			if len(samples) == 0 {
				continue
			}
			t := samples[0].Type
			if t == "" {
				t = TypeGauge
			}
			_, _ = fmt.Fprintf(w, "# HELP %s %s\n# TYPE %s %s\n", name, escapeHelp(samples[0].Help), name, t)
			for _, s := range samples {
				_, _ = fmt.Fprintf(w, "%s%s %s\n", name, formatLabelMap(s.Labels), formatFloat(s.Value))
			}
		}
	}
	return nil
}

func (c *Counter) writeTo(w io.Writer) {
	c.mu.Lock()
	keys := make([]string, 0, len(c.series))
	for k := range c.series {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	if len(keys) == 0 {
		c.mu.Unlock()
		return
	}
	_, _ = fmt.Fprintf(w, "# HELP %s %s\n# TYPE %s counter\n", c.name, escapeHelp(c.help), c.name)
	for _, k := range keys {
		s := c.series[k]
		_, _ = fmt.Fprintf(w, "%s%s %s\n", c.name, formatLabelSlice(c.labelNames, s.labels), formatFloat(s.value))
	}
	c.mu.Unlock()
}

func (g *Gauge) writeTo(w io.Writer) {
	g.mu.Lock()
	keys := make([]string, 0, len(g.series))
	for k := range g.series {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	if len(keys) == 0 {
		g.mu.Unlock()
		return
	}
	_, _ = fmt.Fprintf(w, "# HELP %s %s\n# TYPE %s gauge\n", g.name, escapeHelp(g.help), g.name)
	for _, k := range keys {
		s := g.series[k]
		_, _ = fmt.Fprintf(w, "%s%s %s\n", g.name, formatLabelSlice(g.labelNames, s.labels), formatFloat(s.value))
	}
	g.mu.Unlock()
}

func (h *Histogram) writeTo(w io.Writer) {
	h.mu.Lock()
	keys := make([]string, 0, len(h.series))
	for k := range h.series {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	if len(keys) == 0 {
		h.mu.Unlock()
		return
	}
	_, _ = fmt.Fprintf(w, "# HELP %s %s\n# TYPE %s histogram\n", h.name, escapeHelp(h.help), h.name)
	for _, k := range keys {
		s := h.series[k]
		baseLabels := formatLabelSlice(h.labelNames, s.labels)
		for i, bound := range h.buckets {
			le := strconv.FormatFloat(bound, 'g', -1, 64)
			_, _ = fmt.Fprintf(w, "%s_bucket%s %d\n", h.name, appendLabel(baseLabels, "le", le), s.counts[i])
		}
		_, _ = fmt.Fprintf(w, "%s_bucket%s %d\n", h.name, appendLabel(baseLabels, "le", "+Inf"), s.total)
		_, _ = fmt.Fprintf(w, "%s_sum%s %s\n", h.name, baseLabels, formatFloat(s.sum))
		_, _ = fmt.Fprintf(w, "%s_count%s %d\n", h.name, baseLabels, s.total)
	}
	h.mu.Unlock()
}

func normalizeLabels(names, values []string) []string {
	out := make([]string, len(names))
	for i := range names {
		if i < len(values) {
			out[i] = values[i]
		}
	}
	return out
}

func seriesKey(vals []string) string {
	return strings.Join(vals, "\x00")
}

func formatLabelSlice(names, values []string) string {
	if len(names) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteByte('{')
	for i, n := range names {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(n)
		b.WriteString(`="`)
		if i < len(values) {
			b.WriteString(escapeLabelValue(values[i]))
		}
		b.WriteByte('"')
	}
	b.WriteByte('}')
	return b.String()
}

func formatLabelMap(m map[string]string) string {
	if len(m) == 0 {
		return ""
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	b.WriteByte('{')
	for i, k := range keys {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(k)
		b.WriteString(`="`)
		b.WriteString(escapeLabelValue(m[k]))
		b.WriteByte('"')
	}
	b.WriteByte('}')
	return b.String()
}

func appendLabel(existing, key, val string) string {
	pair := key + `="` + escapeLabelValue(val) + `"`
	if existing == "" {
		return "{" + pair + "}"
	}
	return strings.TrimSuffix(existing, "}") + "," + pair + "}"
}

func escapeLabelValue(v string) string {
	v = strings.ReplaceAll(v, `\`, `\\`)
	v = strings.ReplaceAll(v, "\n", `\n`)
	return strings.ReplaceAll(v, `"`, `\"`)
}

func escapeHelp(h string) string {
	h = strings.ReplaceAll(h, `\`, `\\`)
	return strings.ReplaceAll(h, "\n", `\n`)
}

func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'g', -1, 64)
}
