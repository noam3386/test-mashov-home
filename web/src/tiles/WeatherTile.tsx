import { useEffect, useState } from "react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
}

const HOD_HASHARON_LAT = 32.1533;
const HOD_HASHARON_LON = 34.8878;
const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

function weatherInfo(code: number): { emoji: string; label: string } {
  if (code === 0)              return { emoji: "☀️",  label: "בהיר" };
  if (code <= 2)               return { emoji: "🌤️", label: "מעונן חלקית" };
  if (code === 3)              return { emoji: "☁️",  label: "מעונן" };
  if (code <= 49)              return { emoji: "🌫️", label: "ערפל" };
  if (code <= 55)              return { emoji: "🌦️", label: "טפטוף" };
  if (code <= 65)              return { emoji: "🌧️", label: "גשם" };
  if (code <= 77)              return { emoji: "❄️",  label: "שלג" };
  if (code <= 82)              return { emoji: "🌧️", label: "ממטרים" };
  if (code <= 99)              return { emoji: "⛈️",  label: "סופת רעמים" };
  return { emoji: "🌡️", label: "לא ידוע" };
}

export function WeatherTile() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  async function fetchWeather() {
    try {
      setError(false);
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${HOD_HASHARON_LAT}&longitude=${HOD_HASHARON_LON}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
        `&timezone=Asia%2FJerusalem&wind_speed_unit=kmh`;

      const res = await fetch(url);
      const json = await res.json();
      const c = json.current;

      setWeather({
        temp: Math.round(c.temperature_2m),
        feelsLike: Math.round(c.apparent_temperature),
        humidity: c.relative_humidity_2m,
        windSpeed: Math.round(c.wind_speed_10m),
        code: c.weather_code,
      });
      setLastUpdate(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const { emoji, label } = weather ? weatherInfo(weather.code) : { emoji: "🌡️", label: "" };

  return (
    <div className="tile flex flex-col min-h-40">
      <div className="tile-title">
        🌍 מזג אוויר — הוד השרון
        {lastUpdate && (
          <span className="mr-auto text-gray-300 text-xs font-normal">
            עודכן {lastUpdate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="skeleton h-16 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          שגיאה בטעינת מזג האוויר
          <button onClick={fetchWeather} className="mr-2 text-blue-400 underline">נסה שוב</button>
        </div>
      ) : weather && (
        <div className="flex items-center gap-4 mt-1">
          <div className="text-6xl leading-none">{emoji}</div>
          <div className="flex-1">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-gray-800">{weather.temp}°</span>
              <span className="text-gray-500 text-sm mb-1 pb-0.5">מרגיש {weather.feelsLike}°</span>
            </div>
            <div className="text-gray-600 font-medium">{label}</div>
          </div>
          <div className="text-left text-sm text-gray-500 space-y-1 flex-shrink-0">
            <div>💧 {weather.humidity}%</div>
            <div>💨 {weather.windSpeed} קמ"ש</div>
          </div>
        </div>
      )}
    </div>
  );
}
