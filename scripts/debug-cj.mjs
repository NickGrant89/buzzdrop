#!/usr/bin/env node
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const apiKey = env.CJ_API_KEY;
const base = "https://developers.cjdropshipping.com/api2.0/v1";

async function cjGet(token, p) {
  const res = await fetch(`${base}${p}`, {
    headers: { "CJ-Access-Token": token, platformToken: token },
  });
  return res.json();
}

async function main() {
  const auth = await fetch(`${base}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  }).then((r) => r.json());

  console.log("AUTH:", auth.code, auth.message);
  if (auth.code !== 200) return;

  const token = auth.data.accessToken;

  const endpoints = [
    "/product/list?pageNum=1&pageSize=5&searchType=0",
    "/product/list?pageNum=1&pageSize=5&searchType=2",
    "/product/listV2?page=1&size=5&keyWord=phone",
    "/product/listV2?page=1&size=5&productFlag=0",
  ];

  for (const ep of endpoints) {
    const json = await cjGet(token, ep);
    const data = json.data;
    let count = 0;
    if (data?.list) count = data.list.length;
    else if (data?.content) {
      count = data.content.flatMap((b) => b.productList ?? []).length;
    }
    console.log("\n---", ep, "---");
    console.log("code:", json.code, "message:", json.message, "items:", count);
    if (count > 0) {
      const first =
        data.list?.[0] ??
        data.content?.flatMap((b) => b.productList ?? [])[0];
      console.log("first keys:", Object.keys(first));
      console.log("first:", JSON.stringify(first).slice(0, 400));

      const pid = first.pid ?? first.id;
      if (pid) {
        const q = await cjGet(
          token,
          `/product/query?pid=${pid}&features=enable_description`
        );
        console.log("query code:", q.code, q.message);
        const vl = q.data?.variantList?.length ?? 0;
        console.log("variantList length:", vl);
        if (vl > 0) console.log("first variant:", JSON.stringify(q.data.variantList[0]).slice(0, 300));
      }
    }
  }
}

main().catch(console.error);
