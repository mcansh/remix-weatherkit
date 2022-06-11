import * as React from "react";
import type {
  ActionFunction,
  HeadersFunction,
  LoaderFunction,
} from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getToken } from "~/services/weather.server";
import type { components } from "~/types/weatherkit";

import lightningIconUrl from "~/assets/cloud-lightning.svg";
import moonIconUrl from "~/assets/cloud-moon.svg";
import rainIconUrl from "~/assets/cloud-rain.svg";
import partlySunnyIconUrl from "~/assets/cloud-sun.svg";
import snowflakeIconUrl from "~/assets/snowflake.svg";
import sunIconUrl from "~/assets/sun.svg";
import cloudyIconUrl from "~/assets/cloud.svg";

import { Form, useLoaderData } from "@remix-run/react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import type { SetRequired } from "type-fest";

const { format: formatPercent } = new Intl.NumberFormat("en-US", {
  style: "percent",
});

interface LoaderData {
  weather: SetRequired<
    components["schemas"]["Weather"],
    "currentWeather" | "forecastHourly"
  > | null;
}

async function getCoordinates(city: string) {
  let promise = await fetch(`https://geocode.xyz/${city}?json=1`);
  let json = await promise.json();
  return { lat: json.latt, lng: json.longt };
}

function celsiusToFahrenheit(celsius: number) {
  return Math.round((celsius * 9) / 5 + 32);
}

export const loader: LoaderFunction = async ({ request }) => {
  let url = new URL(request.url);
  let search = url.searchParams.get("search");
  let latitude = url.searchParams.get("lat");
  let longitude = url.searchParams.get("lng");

  if (search) {
    try {
      let cords = await getCoordinates(search);
      latitude = cords.lat;
      longitude = cords.lng;
    } catch (error) {
      throw new Response("search not found", { status: 422 });
    }
  }

  if (latitude && longitude) {
    let token = await getToken();
    let url = `https://weatherkit.apple.com/api/v1/weather/en-US/${latitude}/${longitude}?dataSets=currentWeather,forecastHourly`;
    let response = await fetch(url, { headers: { Authorization: token } });
    let weather = await response.json();

    return json<LoaderData>(
      { weather },
      { headers: { "Cache-Control": "private, max-age=3600" } }
    );
  }

  return json<LoaderData>({ weather: null });
};

export const action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  let search = formData.get("search");

  if (typeof search !== "string") {
    throw new Response("search not found", { status: 422 });
  }

  try {
    let cords = await getCoordinates(search);
    return redirect("/?lat=" + cords.lat + "&lng=" + cords.lng);
  } catch (error) {
    throw new Response("search not found", { status: 422 });
  }
};

export const headers: HeadersFunction = ({ loaderHeaders }) => {
  let headers = new Headers();
  let cacheControl = loaderHeaders.get("Cache-Control");
  if (cacheControl) {
    headers.set("Cache-Control", cacheControl);
  }
  return headers;
};

export default function Index() {
  let data = useLoaderData() as LoaderData;

  return (
    <div className="max-w-prose mx-auto">
      <h1 className="text-3xl text-blue-600">Welcome to Remix + WeatherKit</h1>
      <Form method="post">
        <input type="text" name="search" placeholder="Detroit" />
        <button type="submit">Search</button>
      </Form>

      {data.weather && (
        <>
          <Weather currentWeather={data.weather.currentWeather} />

          <div>
            <div className="flex gap-4 overflow-x-scroll">
              {data.weather.forecastHourly?.hours.map((hour) => {
                let time = format(
                  parseISO(hour.forecastStart),
                  "haaaaa" // 10A, 2P, 3P, etc
                ).toUpperCase();
                return (
                  <div
                    key={hour.forecastStart}
                    className="flex flex-col justify-center text-center"
                  >
                    <h3 className="text-gray-400">{time}</h3>
                    <div className="h-10 w-px bg-black mx-auto" />
                    <svg className="w-6 h-6 my-2">
                      <use href={getIconFromCode(hour.conditionCode)} />
                    </svg>
                    <div className="h-10 w-px bg-black mx-auto" />
                    <span
                      className={clsx("rounded text-white mt-1", {
                        "bg-red-600": hour.uvIndex >= 8,
                        "bg-orange-600": hour.uvIndex >= 6,
                        "bg-yellow-600": hour.uvIndex >= 3,
                        "bg-green-600": hour.uvIndex < 3,
                      })}
                    >
                      {hour.uvIndex}
                    </span>
                    <span
                      className={clsx("text-sm", {
                        "text-blue-500/40": hour.precipitationChance < 0.3,
                        "text-blue-500/60": hour.precipitationChance >= 0.6,
                        "text-blue-500/80": hour.precipitationChance >= 0.8,
                        "text-blue-500/100": hour.precipitationChance === 1,
                      })}
                    >
                      {formatPercent(hour.precipitationChance)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <details open>
            <summary>
              <span className="text-blue-600">Weather</span>
            </summary>
            <pre>
              <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
          </details>

          <footer>
            Weather Data provided by{" "}
            <a href={data.weather.currentWeather?.metadata.attributionURL}>
              WeatherKit
            </a>
          </footer>
        </>
      )}
    </div>
  );
}

function Weather({
  currentWeather,
}: {
  currentWeather: components["schemas"]["CurrentWeather"];
}) {
  let {
    asOf,
    conditionCode,
    temperature,
    temperatureApparent,
    uvIndex,
    humidity,
  } = currentWeather;

  return (
    <>
      <h1>Weather as of {asOf}</h1>

      <div className="flex mx-auto items-center justify-center py-6 bg-blue-500 text-white rounded-lg">
        <svg className="w-20 h-20">
          <use href={getIconFromCode(conditionCode)} />
        </svg>
        <span className="text-5xl">
          {celsiusToFahrenheit(temperature)}
          &deg;
        </span>
        <div className="flex flex-col ml-2 text-sm text-white/80">
          <span>
            Feels {celsiusToFahrenheit(temperatureApparent)}
            &deg;
          </span>
          <span>UV Index {uvIndex}</span>
          <span>Humidity {formatPercent(humidity)}</span>
        </div>
      </div>
    </>
  );
}

function getIconFromCode(code: string) {
  if (["PartlyCloudy", "MostlyCloudy"].includes(code)) {
    return partlySunnyIconUrl + "#cloud-sun";
  }

  if (["Cloudy"].includes(code)) {
    return cloudyIconUrl + "#cloud";
  }

  console.log(code);
}
