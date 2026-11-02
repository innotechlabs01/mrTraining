package activityparse

import (
	"encoding/binary"
	"math"
	"testing"
)

func TestParseGPX(t *testing.T) {
	gpx := []byte(`<?xml version="1.0"?>
<gpx version="1.1">
  <trk><name>Morning run</name>
    <trkseg>
      <trkpt lat="-34.6000" lon="-58.3800"><ele>10</ele><time>2026-10-18T10:00:00Z</time></trkpt>
      <trkpt lat="-34.6010" lon="-58.3810"><ele>15</ele><time>2026-10-18T10:05:00Z</time></trkpt>
      <trkpt lat="-34.6020" lon="-58.3820"><ele>12</ele><time>2026-10-18T10:10:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`)

	act, err := Parse("gpx", gpx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(act.Points) != 3 {
		t.Fatalf("expected 3 points, got %d", len(act.Points))
	}
	if act.Name != "Morning run" {
		t.Errorf("expected track name, got %q", act.Name)
	}
	if act.DurationSec != 600 {
		t.Errorf("expected 600s duration, got %d", act.DurationSec)
	}
	if act.DistanceKm <= 0 {
		t.Error("expected computed distance > 0")
	}
	if act.StartTime != "2026-10-18T10:00:00Z" {
		t.Errorf("unexpected start time %q", act.StartTime)
	}
}

func TestParseTCX(t *testing.T) {
	tcx := []byte(`<?xml version="1.0"?>
<TrainingCenterDatabase>
  <Activities><Activity Sport="Running">
    <Lap>
      <TotalTimeSeconds>1800</TotalTimeSeconds>
      <DistanceMeters>5000</DistanceMeters>
      <Calories>320</Calories>
      <AverageHeartRateBpm><Value>152</Value></AverageHeartRateBpm>
      <MaximumHeartRateBpm><Value>178</Value></MaximumHeartRateBpm>
      <Track>
        <Trackpoint>
          <Time>2026-10-18T09:00:00Z</Time>
          <Position><LatitudeDegrees>-34.60</LatitudeDegrees><LongitudeDegrees>-58.38</LongitudeDegrees></Position>
          <AltitudeMeters>10</AltitudeMeters>
        </Trackpoint>
        <Trackpoint>
          <Time>2026-10-18T09:30:00Z</Time>
          <Position><LatitudeDegrees>-34.61</LatitudeDegrees><LongitudeDegrees>-58.39</LongitudeDegrees></Position>
          <AltitudeMeters>20</AltitudeMeters>
        </Trackpoint>
      </Track>
    </Lap>
  </Activity></Activities>
</TrainingCenterDatabase>`)

	act, err := Parse("tcx", tcx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(act.Points) != 2 {
		t.Fatalf("expected 2 points, got %d", len(act.Points))
	}
	if act.DistanceKm < 4.99 || act.DistanceKm > 5.01 {
		t.Errorf("expected 5km, got %f", act.DistanceKm)
	}
	if act.AvgHeartRate != 152 || act.MaxHeartRate != 178 {
		t.Errorf("unexpected HR %d/%d", act.AvgHeartRate, act.MaxHeartRate)
	}
	if act.Calories != 320 {
		t.Errorf("expected 320 calories, got %d", act.Calories)
	}
	if act.ElevationM != 10 {
		t.Errorf("expected 10m elevation gain, got %f", act.ElevationM)
	}
}

func TestEncodePolyline(t *testing.T) {
	// Known vector: (38.5,-120.2),(40.7,-120.95),(43.252,-126.453)
	// encodes to "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
	pts := []Point{
		{Lat: 38.5, Lng: -120.2},
		{Lat: 40.7, Lng: -120.95},
		{Lat: 43.252, Lng: -126.453},
	}
	got := EncodePolyline(pts)
	want := "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
	if got != want {
		t.Errorf("polyline mismatch:\n got %q\nwant %q", got, want)
	}
}

// buildFIT constructs a minimal FIT file: two record messages and one session.
func buildFIT() []byte {
	var buf []byte
	buf = append(buf, 12, 0x10, 0, 0, 0, 0, 0, 0, '.', 'F', 'I', 'T')

	// Definition for local 0 = record (global 20), fields: 0 lat, 1 lng, 253 ts
	buf = append(buf, 0x80, 0, 0, 20, 0, 3,
		0, 4, 0x85,
		1, 4, 0x85,
		253, 4, 0x86)

	lat1 := int32(math.Round(-34.60 * 2147483648.0 / 180.0))
	lng1 := int32(math.Round(-58.38 * 2147483648.0 / 180.0))
	lat2 := int32(math.Round(-34.61 * 2147483648.0 / 180.0))
	lng2 := int32(math.Round(-58.39 * 2147483648.0 / 180.0))
	ts := uint32(1163000000)

	buf = append(buf, 0x00)
	buf = binary.LittleEndian.AppendUint32(buf, uint32(lat1))
	buf = binary.LittleEndian.AppendUint32(buf, uint32(lng1))
	buf = binary.LittleEndian.AppendUint32(buf, ts)

	buf = append(buf, 0x00)
	buf = binary.LittleEndian.AppendUint32(buf, uint32(lat2))
	buf = binary.LittleEndian.AppendUint32(buf, uint32(lng2))
	buf = binary.LittleEndian.AppendUint32(buf, ts+600)

	// Definition local 1 = session (global 18): distance(9), elapsed(7), calories(11)
	buf = append(buf, 0x81, 0, 0, 18, 0, 3,
		9, 4, 0x86,
		7, 4, 0x86,
		11, 2, 0x84)

	buf = append(buf, 0x01)
	buf = binary.LittleEndian.AppendUint32(buf, 1234) // 12.34 km
	buf = binary.LittleEndian.AppendUint32(buf, 3600*1000)
	buf = binary.LittleEndian.AppendUint16(buf, 300)

	return buf
}

func TestParseFIT(t *testing.T) {
	act, err := Parse("fit", buildFIT())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(act.Points) != 2 {
		t.Fatalf("expected 2 record points, got %d", len(act.Points))
	}
	if math.Abs(act.Points[0].Lat-(-34.60)) > 0.001 {
		t.Errorf("unexpected first lat %f", act.Points[0].Lat)
	}
	if act.DistanceKm != 12.34 {
		t.Errorf("expected 12.34 km from session, got %f", act.DistanceKm)
	}
	if act.DurationSec != 3600 {
		t.Errorf("expected 3600s from session, got %d", act.DurationSec)
	}
	if act.Calories != 300 {
		t.Errorf("expected 300 calories, got %d", act.Calories)
	}
}

func TestParseUnsupportedFormat(t *testing.T) {
	if _, err := Parse("csv", []byte("a,b")); err == nil {
		t.Fatal("expected error for unsupported format")
	}
}
