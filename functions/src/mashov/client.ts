import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import {
  MashovGrade, MashovMessage, MashovBehavior,
  MashovHomework, MashovHatamot, MashovTimetableEntry, MashovSession,
} from "./types";

const BASE_URL = "https://web.mashov.info/api";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function mashovLogin(
  semel: number,
  username: string,
  password: string,
  year: number
): Promise<MashovSession> {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  const response = await client.post(
    `${BASE_URL}/login`,
    { semel, username, password, year },
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  const csrfToken = response.headers["x-csrf-token"] as string;
  if (!csrfToken) throw new Error("No CSRF token from Mashov login");

  const cookies = await jar.getCookies(BASE_URL);
  const sessionCookie = cookies.map((c) => `${c.key}=${c.value}`).join("; ");

  return {
    cookie: sessionCookie,
    csrfToken,
    semel,
    studentId: String(response.data?.students?.[0]?.pupilId ?? username),
  };
}

export async function fetchGrades(session: MashovSession): Promise<MashovGrade[]> {
  const response = await axios.get(
    `${BASE_URL}/students/${session.studentId}/grades`,
    { headers: buildHeaders(session) }
  );
  return response.data as MashovGrade[];
}

export async function fetchMessages(session: MashovSession): Promise<MashovMessage[]> {
  const response = await axios.get(`${BASE_URL}/messages`, {
    params: { folder: 1, page: 1, pageSize: 20 },
    headers: buildHeaders(session),
  });
  return response.data as MashovMessage[];
}

export async function fetchBehavior(session: MashovSession): Promise<MashovBehavior[]> {
  const response = await axios.get(
    `${BASE_URL}/students/${session.studentId}/behave`,
    { headers: buildHeaders(session) }
  );
  return response.data as MashovBehavior[];
}

export async function fetchHomework(session: MashovSession): Promise<MashovHomework[]> {
  const response = await axios.get(
    `${BASE_URL}/students/${session.studentId}/homework`,
    { headers: buildHeaders(session) }
  );
  return response.data as MashovHomework[];
}

export async function fetchHatamot(session: MashovSession): Promise<MashovHatamot[]> {
  const response = await axios.get(
    `${BASE_URL}/students/${session.studentId}/hatamot`,
    { headers: buildHeaders(session) }
  );
  return response.data as MashovHatamot[];
}

export async function fetchTimetable(session: MashovSession): Promise<MashovTimetableEntry[]> {
  const response = await axios.get(
    `${BASE_URL}/students/${session.studentId}/groups/all`,
    { headers: buildHeaders(session) }
  );
  return response.data as MashovTimetableEntry[];
}

export async function mashovLogout(session: MashovSession): Promise<void> {
  await axios
    .post(`${BASE_URL}/logout`, {}, { headers: buildHeaders(session) })
    .catch(() => {});
}

function buildHeaders(session: MashovSession) {
  return {
    "User-Agent": USER_AGENT,
    "Cookie": session.cookie,
    "X-Csrf-Token": session.csrfToken,
    "X-Requested-With": "XMLHttpRequest",
  };
}
