export type SocialLink = {
  id: "facebook" | "instagram" | "tiktok";
  label: string;
  href: string;
};

function trimUrl(value: string | undefined, fallback: string): string {
  const url = (value?.trim() || fallback).replace(/\/$/, "");
  return url;
}

/** Public social profile URLs — override in Railway with NEXT_PUBLIC_* vars. */
export function getSocialLinks(): SocialLink[] {
  return [
    {
      id: "facebook",
      label: "Facebook",
      href: trimUrl(process.env.NEXT_PUBLIC_FACEBOOK_URL, "https://www.facebook.com/buzzdropuk"),
    },
    {
      id: "instagram",
      label: "Instagram",
      href: trimUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, "https://www.instagram.com/buzzdropuk"),
    },
    {
      id: "tiktok",
      label: "TikTok",
      href: trimUrl(process.env.NEXT_PUBLIC_TIKTOK_URL, "https://www.tiktok.com/@buzzdropuk"),
    },
  ];
}
