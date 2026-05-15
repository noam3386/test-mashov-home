import { useEffect, useState } from "react";
import { CardHead } from "../components/CardHead";
import { WeatherGlyph, weatherKind, weatherLabel } from "../components/WeatherGlyph";

interface WeatherData {
  temp: number;
  feelsLike: number;
  code: number;
  forecast: { day: string; hi: number; lo: number; code: number }[];
}

const HOD_LAT = 32.1533;
const HOD_LON = 34.8878;
const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function WeatherTile() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast`
          + `?latitude=${HOD_LAT}&longitude=${HOD_LON}`
          + `&current=temperature_2m,apparent_temperature,weather_code`
          + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
          + `&forecast_days=6&timezone=Asia%2FJerusalem`;
        const res  = await globalThis.fetch(url);
        const json = await res.json();
        const c    = json.current;
        const d    = json.daily;
        const forecast = (d.time as string[]).slice(1, 6).map((date: string, i: number) => ({
          day:  HE_DAYS[new Date(date + 'T12:00:00').getDay()],
          hi:   Math.round(d.temperature_2m_max[i + 1]),
          lo:   Math.round(d.temperature_2m_min[i + 1]),
          code: d.weather_code[i + 1] as number,
        }));
        setWeather({
          temp:      Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          code:      c.weather_code as number,
          forecast,
        });
      } finally {
        setLoading(false);
      }
    }
    fetch_();
    const id = setInterval(fetch_, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="tile h-full flex flex-col">
      <CardHead he="מזג אוויר" en="WEATHER · HOD HASHARON" />

      {loading ? <Skeleton /> : weather && (
        <>
          {/* Hero row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flex: '0 0 auto' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 56, fontWeight: 500, color: 'var(--fd-ink)', letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--fd-font-sans)' }}>
                  {weather.temp}
                </span>
                <span style={{ fontSize: 24, color: 'var(--fd-muted)', fontWeight: 500 }}>°</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--fd-muted)', fontWeight: 500, marginTop: 4 }}>
                {weatherLabel(weather.code)} · מרגיש כמו {weather.feelsLike}°
              </div>
            </div>
            <WeatherGlyph kind={weatherKind(weather.code)} size={68} color="var(--fd-sage)" accent="var(--fd-terra)" />
          </div>

          {/* 5-day forecast */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: 4,
            paddingTop: 14, borderTop: '1px solid var(--fd-divider)',
            flex: 1,
          }}>
            {weather.forecast.map((f) => (
              <div key={f.day} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--fd-faint)', fontWeight: 600, marginBottom: 6 }}>{f.day}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <WeatherGlyph kind={weatherKind(f.code)} size={22} color="var(--fd-muted)" accent="var(--fd-terra)" />
                </div>
                <div style={{ fontSize: 11, color: 'var(--fd-muted)', marginTop: 4, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {f.hi}° <span style={{ color: 'var(--fd-faint)' }}>{f.lo}°</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 40, borderRadius: 12 }} />
    </div>
  );
}
