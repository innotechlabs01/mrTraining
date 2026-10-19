// Package activityparse parses running activity files (GPX, TCX, FIT) into a
// normalized Activity. It is shared by the file-import endpoint and the Garmin
// provider adapter.
package activityparse

import (
	"encoding/xml"
	"fmt"
	"math"
	"strings"
	"time"
)

// Point is one GPS sample of an activity.
type Point struct {
	Lat       float64
	Lng       float64
	Alt       float64
	Timestamp string // RFC3339 UTC
	Accuracy  float64
}

// Activity is the normalized result of parsing an activity file.
type Activity struct {
	Name         string
	StartTime    string // RFC3339 UTC
	DurationSec  int
	DistanceKm   float64
	ElevationM   float64
	Calories     int
	AvgHeartRate int
	MaxHeartRate int
	Cadence      int
	Points       []Point
}

// Parse dispatches on the file format ("gpx", "tcx", "fit").
func Parse(format string, data []byte) (*Activity, error) {
	switch strings.ToLower(format) {
	case "gpx":
		return parseGPX(data)
	case "tcx":
		return parseTCX(data)
	case "fit":
		return parseFIT(data)
	default:
		return nil, fmt.Errorf("unsupported activity format: %s", format)
	}
}

// --- GPX ---

type gpxDoc struct {
	XMLName xml.Name `xml:"gpx"`
	Tracks  []gpxTrk `xml:"trk"`
}

type gpxTrk struct {
	Name     string      `xml:"name"`
	Segments []gpxTrkSeg `xml:"trkseg"`
}

type gpxTrkSeg struct {
	Points []gpxPoint `xml:"trkpt"`
}

type gpxPoint struct {
	Lat  float64 `xml:"lat,attr"`
	Lon  float64 `xml:"lon,attr"`
	Ele  float64 `xml:"ele"`
	Time string  `xml:"time"`
}

func parseGPX(data []byte) (*Activity, error) {
	var doc gpxDoc
	if err := xml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("parse gpx: %w", err)
	}

	act := &Activity{}
	if len(doc.Tracks) > 0 {
		act.Name = doc.Tracks[0].Name
	}
	var first, last time.Time
	for _, trk := range doc.Tracks {
		for _, seg := range trk.Segments {
			for _, p := range seg.Points {
				pt := Point{Lat: p.Lat, Lng: p.Lon, Alt: p.Ele}
				if t, err := time.Parse(time.RFC3339, p.Time); err == nil {
					pt.Timestamp = t.UTC().Format(time.RFC3339)
					if first.IsZero() {
						first = t
					}
					last = t
				}
				act.Points = append(act.Points, pt)
			}
		}
	}
	if len(act.Points) == 0 {
		return nil, fmt.Errorf("gpx has no track points")
	}
	finalize(act, first, last)
	return act, nil
}

// --- TCX ---

type tcxDoc struct {
	XMLName  xml.Name `xml:"TrainingCenterDatabase"`
	Activity []struct {
		Laps []struct {
			TotalTime        float64 `xml:"TotalTimeSeconds"`
			Distance         float64 `xml:"DistanceMeters"`
			Calories         int     `xml:"Calories"`
			AverageHeartRate struct {
				Value int `xml:"Value"`
			} `xml:"AverageHeartRateBpm"`
			MaximumHeartRate struct {
				Value int `xml:"Value"`
			} `xml:"MaximumHeartRateBpm"`
			Track []struct {
				Points []struct {
					Time     string `xml:"Time"`
					Position struct {
						Lat float64 `xml:"LatitudeDegrees"`
						Lng float64 `xml:"LongitudeDegrees"`
					} `xml:"Position"`
					Altitude  float64 `xml:"AltitudeMeters"`
					Distance  float64 `xml:"DistanceMeters"`
					HeartRate *struct {
						Value int `xml:"Value"`
					} `xml:"HeartRateBpm"`
				} `xml:"Trackpoint"`
			} `xml:"Track"`
		} `xml:"Lap"`
	} `xml:"Activities>Activity"`
}

func parseTCX(data []byte) (*Activity, error) {
	var doc tcxDoc
	if err := xml.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("parse tcx: %w", err)
	}

	act := &Activity{}
	var first, last time.Time
	for _, a := range doc.Activity {
		for _, lap := range a.Laps {
			act.DistanceKm += lap.Distance / 1000
			act.Calories += lap.Calories
			if lap.AverageHeartRate.Value > 0 {
				act.AvgHeartRate = lap.AverageHeartRate.Value
			}
			if lap.MaximumHeartRate.Value > act.MaxHeartRate {
				act.MaxHeartRate = lap.MaximumHeartRate.Value
			}
			for _, tr := range lap.Track {
				for _, tp := range tr.Points {
					pt := Point{Lat: tp.Position.Lat, Lng: tp.Position.Lng, Alt: tp.Altitude}
					if t, err := time.Parse(time.RFC3339, tp.Time); err == nil {
						pt.Timestamp = t.UTC().Format(time.RFC3339)
						if first.IsZero() {
							first = t
						}
						last = t
					}
					act.Points = append(act.Points, pt)
				}
			}
		}
	}
	if len(act.Points) == 0 {
		return nil, fmt.Errorf("tcx has no trackpoints")
	}
	finalize(act, first, last)
	return act, nil
}

// --- shared helpers ---

// finalize fills duration/distance/elevation from points when the file did not
// provide them.
func finalize(act *Activity, first, last time.Time) {
	if act.DistanceKm == 0 {
		act.DistanceKm = polylineDistanceKm(act.Points)
	}
	if act.DurationSec == 0 && !first.IsZero() && !last.IsZero() {
		act.DurationSec = int(last.Sub(first).Seconds())
	}
	if act.ElevationM == 0 {
		act.ElevationM = elevationGain(act.Points)
	}
	if act.StartTime == "" && !first.IsZero() {
		act.StartTime = first.UTC().Format(time.RFC3339)
	}
}

func haversineMeters(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * R * math.Asin(math.Sqrt(h))
}

func polylineDistanceKm(points []Point) float64 {
	total := 0.0
	for i := 1; i < len(points); i++ {
		total += haversineMeters(points[i-1].Lat, points[i-1].Lng, points[i].Lat, points[i].Lng)
	}
	return total / 1000
}

func elevationGain(points []Point) float64 {
	gain := 0.0
	for i := 1; i < len(points); i++ {
		d := points[i].Alt - points[i-1].Alt
		if d > 0 {
			gain += d
		}
	}
	return gain
}

// EncodePolyline encodes points with the Google polyline algorithm (precision
// 5), matching @mapbox/polyline used by web and mobile.
func EncodePolyline(points []Point) string {
	var b strings.Builder
	prevLat, prevLng := int64(0), int64(0)
	for _, p := range points {
		lat := int64(math.Round(p.Lat * 1e5))
		lng := int64(math.Round(p.Lng * 1e5))
		encodeNumber(&b, lat-prevLat)
		encodeNumber(&b, lng-prevLng)
		prevLat, prevLng = lat, lng
	}
	return b.String()
}

func encodeNumber(b *strings.Builder, v int64) {
	var n uint64
	if v < 0 {
		n = uint64(^(v << 1))
	} else {
		n = uint64(v << 1)
	}
	for n >= 0x20 {
		b.WriteByte(byte((0x20 | (n & 0x1f)) + 63))
		n >>= 5
	}
	b.WriteByte(byte(n + 63))
}

// --- FIT (minimal decoder) ---

const (
	fitMsgFileID  = 0
	fitMsgSession = 18
	fitMsgRecord  = 20
)

type fitFieldDef struct {
	num  byte
	size byte
	base byte
}

type fitDefinition struct {
	arch   byte
	global uint16
	fields []fitFieldDef
}

// parseFIT decodes the subset of the FIT protocol needed for running
// activities: record (GPS/HR/cadence), session (totals) and file_id.
func parseFIT(data []byte) (*Activity, error) {
	if len(data) < 12 {
		return nil, fmt.Errorf("fit: file too short")
	}
	headerSize := int(data[0])
	if headerSize != 12 && headerSize != 14 {
		return nil, fmt.Errorf("fit: invalid header size %d", headerSize)
	}
	if len(data) < headerSize {
		return nil, fmt.Errorf("fit: truncated header")
	}
	if string(data[8:12]) != ".FIT" {
		return nil, fmt.Errorf("fit: missing .FIT signature")
	}

	defs := map[byte]*fitDefinition{}
	act := &Activity{}
	var first, last time.Time
	var sessionDistance float64
	var sessionElapsed float64
	var sessionCalories int
	var sessionAvgHR, sessionMaxHR int

	pos := headerSize
	for pos < len(data) {
		header := data[pos]
		pos++

		if header&0x80 != 0 { // definition message
			hasDev := header&0x20 != 0
			local := header & 0x0f
			if pos+5 > len(data) {
				return nil, fmt.Errorf("fit: truncated definition")
			}
			arch := data[pos+1]
			global := uint16(data[pos+2]) | uint16(data[pos+3])<<8
			if arch == 1 { // big endian
				global = uint16(data[pos+2])<<8 | uint16(data[pos+3])
			}
			numFields := int(data[pos+4])
			pos += 5
			def := &fitDefinition{arch: arch, global: global}
			if pos+numFields*3 > len(data) {
				return nil, fmt.Errorf("fit: truncated field defs")
			}
			for i := 0; i < numFields; i++ {
				def.fields = append(def.fields, fitFieldDef{
					num:  data[pos+i*3],
					size: data[pos+i*3+1],
					base: data[pos+i*3+2],
				})
			}
			pos += numFields * 3
			if hasDev {
				if pos >= len(data) {
					return nil, fmt.Errorf("fit: truncated dev field count")
				}
				numDev := int(data[pos])
				pos++
				pos += numDev * 3
			}
			defs[local] = def
			continue
		}

		// Data message
		local := header & 0x0f
		def, ok := defs[local]
		if !ok {
			return nil, fmt.Errorf("fit: data message without definition (local %d)", local)
		}
		values := map[byte]uint64{}
		for _, f := range def.fields {
			if pos+int(f.size) > len(data) {
				return nil, fmt.Errorf("fit: truncated field data")
			}
			if v, ok := readFitValue(data[pos:pos+int(f.size)], f.base, def.arch); ok {
				values[f.num] = v
			}
			pos += int(f.size)
		}

		switch def.global {
		case fitMsgRecord:
			rec := Point{}
			if v, ok := values[0]; ok {
				rec.Lat = semicirclesToDegrees(int32(v))
			}
			if v, ok := values[1]; ok {
				rec.Lng = semicirclesToDegrees(int32(v))
			}
			if v, ok := values[78]; ok { // enhanced_altitude
				rec.Alt = float64(v)/5 - 500
			} else if v, ok := values[2]; ok {
				rec.Alt = float64(v)/5 - 500
			}
			if v, ok := values[253]; ok {
				t := fitEpoch.Add(time.Duration(v) * time.Second)
				rec.Timestamp = t.UTC().Format(time.RFC3339)
				if first.IsZero() {
					first = t
				}
				last = t
			}
			if v, ok := values[3]; ok {
				if act.AvgHeartRate == 0 || int(v) > 0 {
					// keep per-point HR only as indicator for avg if session missing
					act.MaxHeartRate = maxInt(act.MaxHeartRate, int(v))
				}
			}
			if v, ok := values[4]; ok {
				act.Cadence = int(v)
			}
			if rec.Lat != 0 || rec.Lng != 0 {
				act.Points = append(act.Points, rec)
			}

		case fitMsgSession:
			if v, ok := values[9]; ok { // total_distance, scale 100
				sessionDistance = float64(v) / 100
			}
			if v, ok := values[7]; ok { // total_elapsed_time, scale 1000
				sessionElapsed = float64(v) / 1000
			}
			if v, ok := values[11]; ok {
				sessionCalories = int(v)
			}
			if v, ok := values[16]; ok {
				sessionAvgHR = int(v)
			}
			if v, ok := values[17]; ok {
				sessionMaxHR = int(v)
			}
			if v, ok := values[2]; ok { // start_time
				t := fitEpoch.Add(time.Duration(v) * time.Second)
				act.StartTime = t.UTC().Format(time.RFC3339)
			}

		case fitMsgFileID:
			// no-op: format marker
		}
	}

	if len(act.Points) == 0 {
		return nil, fmt.Errorf("fit: no record messages found")
	}
	act.DistanceKm = sessionDistance
	act.DurationSec = int(sessionElapsed)
	act.Calories = sessionCalories
	if sessionAvgHR > 0 {
		act.AvgHeartRate = sessionAvgHR
	}
	if sessionMaxHR > act.MaxHeartRate {
		act.MaxHeartRate = sessionMaxHR
	}
	finalize(act, first, last)
	return act, nil
}

var fitEpoch = time.Date(1989, time.December, 31, 0, 0, 0, 0, time.UTC)

func semicirclesToDegrees(v int32) float64 {
	return float64(v) * (180.0 / 2147483648.0)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// readFitValue decodes a numeric FIT field. Strings/byte arrays are skipped.
func readFitValue(b []byte, base, arch byte) (uint64, bool) {
	if len(b) == 0 {
		return 0, false
	}
	be := arch == 1
	switch base {
	case 0x00, 0x02, 0x0A, 0x0D: // enum, uint8, uint8z, byte
		return uint64(b[0]), true
	case 0x01: // sint8
		return uint64(int64(int8(b[0]))), true
	case 0x83: // sint16
		if len(b) < 2 {
			return 0, false
		}
		if be {
			return uint64(int64(int16(uint16(b[0])<<8 | uint16(b[1])))), true
		}
		return uint64(int64(int16(uint16(b[1])<<8 | uint16(b[0])))), true
	case 0x84, 0x8B: // uint16, uint16z
		if len(b) < 2 {
			return 0, false
		}
		if be {
			return uint64(uint16(b[0])<<8 | uint16(b[1])), true
		}
		return uint64(uint16(b[1])<<8 | uint16(b[0])), true
	case 0x85, 0x86, 0x8C: // sint32, uint32, uint32z
		if len(b) < 4 {
			return 0, false
		}
		var u uint32
		if be {
			u = uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
		} else {
			u = uint32(b[3])<<24 | uint32(b[2])<<16 | uint32(b[1])<<8 | uint32(b[0])
		}
		if base == 0x85 {
			return uint64(int64(int32(u))), true
		}
		return uint64(u), true
	case 0x88: // float32
		if len(b) < 4 {
			return 0, false
		}
		bits := uint32(b[0]) | uint32(b[1])<<8 | uint32(b[2])<<16 | uint32(b[3])<<24
		if be {
			bits = uint32(b[3]) | uint32(b[2])<<8 | uint32(b[1])<<16 | uint32(b[0])<<24
		}
		return uint64(math.Float32bits(math.Float32frombits(bits))), true
	default:
		return 0, false
	}
}
