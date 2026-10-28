import { NextRequest, NextResponse } from 'next/server';
import { decodeGooglePolyline, parseGoogleDuration } from '@/lib/polyline';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both nested { origin: { latitude, longitude } } and flat { startLat, startLng }
    const originLat = body.origin?.latitude ?? body.origin?.location?.latLng?.latitude ?? body.startLat;
    const originLng = body.origin?.longitude ?? body.origin?.location?.latLng?.longitude ?? body.startLng;
    const destLat = body.destination?.latitude ?? body.destination?.location?.latLng?.latitude ?? body.destLat;
    const destLng = body.destination?.longitude ?? body.destination?.location?.latLng?.longitude ?? body.destLng;

    const rawMode = (body.travelMode || body.mode || 'DRIVE').toString().toUpperCase();
    const isWalking = rawMode === 'WALK' || rawMode === 'WALKING';
    const travelMode = isWalking ? 'WALK' : 'DRIVE';

    // 1. Validate coordinates
    if (
      typeof originLat !== 'number' ||
      typeof originLng !== 'number' ||
      typeof destLat !== 'number' ||
      typeof destLng !== 'number' ||
      isNaN(originLat) ||
      isNaN(originLng) ||
      isNaN(destLat) ||
      isNaN(destLng)
    ) {
      return NextResponse.json(
        { error: 'Invalid origin or destination coordinates. Both latitude and longitude are required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    // 2. Call Google Maps Routes API if key is present
    if (apiKey && apiKey !== 'your_google_maps_api_key') {
      try {
        const googleUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        const requestPayload: any = {
          origin: {
            location: {
              latLng: {
                latitude: originLat,
                longitude: originLng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destLat,
                longitude: destLng,
              },
            },
          },
          travelMode: travelMode,
          computeAlternativeRoutes: false,
          units: 'METRIC',
        };

        if (!isWalking) {
          requestPayload.routingPreference = 'TRAFFIC_AWARE';
        }

        const googleRes = await fetch(googleUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration',
          },
          body: JSON.stringify(requestPayload),
        });

        if (googleRes.ok) {
          const googleData = await googleRes.json();
          const route = googleData.routes?.[0];

          if (route) {
            const distanceMeters = route.distanceMeters || 0;
            const distanceKm = Number((distanceMeters / 1000).toFixed(2));
            const { durationMinutes, formattedDuration } = parseGoogleDuration(route.duration);

            const encodedPolyline = route.polyline?.encodedPolyline || '';
            const coordinates = decodeGooglePolyline(encodedPolyline);

            // Parse turn-by-turn steps
            const steps: any[] = [];
            const leg = route.legs?.[0];
            if (leg?.steps) {
              for (const s of leg.steps) {
                const nav = s.navigationInstruction;
                const instruction = nav?.instructions || (nav?.maneuver ? nav.maneuver.replace(/_/g, ' ') : 'Continue on route');
                const stepMeters = s.distanceMeters || 0;
                const stepSeconds = s.staticDuration ? parseInt(s.staticDuration.replace('s', ''), 10) : 0;

                steps.push({
                  type: nav?.maneuver || 'turn',
                  modifier: '',
                  name: instruction,
                  instruction: instruction,
                  distance_meters: stepMeters,
                  duration_seconds: stepSeconds,
                });
              }
            }

            return NextResponse.json({
              provider: 'Google Maps Routes API',
              distance_km: distanceKm,
              formatted_distance: `${distanceKm.toFixed(2)} km`,
              distance_meters: distanceMeters,
              duration_minutes: durationMinutes,
              formatted_duration: formattedDuration,
              coordinates: coordinates.length > 0 ? coordinates : [[originLat, originLng], [destLat, destLng]],
              steps: steps,
              mode: isWalking ? 'walking' : 'driving',
              is_fallback: false,
            });
          }
        } else {
          const errText = await googleRes.text();
          console.warn('Google Routes API returned non-OK status:', googleRes.status, errText);
        }
      } catch (err: any) {
        console.warn('Google Routes API request failed:', err.message);
      }
    }

    // 3. Fallback to local OSRM routing engine if Google key is not set or request failed
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const osrmMode = isWalking ? 'walking' : 'driving';
    const osrmRes = await fetch(
      `${apiUrl}/routing/directions?start_lat=${originLat}&start_lng=${originLng}&dest_lat=${destLat}&dest_lng=${destLng}&mode=${osrmMode}`
    );

    if (osrmRes.ok) {
      const osrmData = await osrmRes.json();
      return NextResponse.json({
        ...osrmData,
        provider: apiKey ? 'OSRM Street Engine (Google API fallback)' : 'OSRM Open Source Routing Machine',
        formatted_distance: `${osrmData.distance_km?.toFixed(2) || '0.00'} km`,
      });
    }

    return NextResponse.json(
      { error: 'Unable to compute route from routing services.' },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: `Route computation error: ${error.message}` },
      { status: 500 }
    );
  }
}
