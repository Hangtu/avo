import { ACCOUNT_STORAGE_INFIX, ACCOUNT_STORAGE_PREFIX, SPACE_STORAGE_KEYS } from "@/lib/db/local-space";
import { ACCESS_KEY } from "@/lib/sync/access-marker";

import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, NIGHT_END_HOUR, NIGHT_START_HOUR } from "./theme";

/**
 * Runs before hydration. An account reads only its own scoped mirror; the guest
 * keeps the historical key; a locked or unknown space never reads another
 * account's key. Cosmetic only: IndexedDB stays authoritative after mount.
 */
export function themeBootScript(): string {
  const infix = JSON.stringify(ACCOUNT_STORAGE_INFIX);
  return `(function(){try{
var key=${JSON.stringify(SPACE_STORAGE_KEYS.theme)};
try{
var access=JSON.parse(localStorage.getItem(${JSON.stringify(ACCESS_KEY)})||"null");
if(access&&access.locked===false&&typeof access.accountId==="string"&&access.accountId){key=${JSON.stringify(ACCOUNT_STORAGE_PREFIX)}+encodeURIComponent(access.accountId)+${infix}+${JSON.stringify(SPACE_STORAGE_KEYS.theme)};}
}catch(e){}
var mode=null;try{mode=localStorage.getItem(key);}catch(e){}
if(mode!=="light"&&mode!=="dark"&&mode!=="auto"){mode="auto";}
var hour=new Date().getHours();
var dark=mode==="dark"||(mode==="auto"&&(hour>=${NIGHT_START_HOUR}||hour<${NIGHT_END_HOUR}));
var theme=dark?"dark":"light";
document.documentElement.dataset.theme=theme;
document.documentElement.style.colorScheme=theme;
var meta=document.querySelector('meta[name="theme-color"]');
if(meta){meta.setAttribute("content",dark?${JSON.stringify(DARK_THEME_COLOR)}:${JSON.stringify(LIGHT_THEME_COLOR)});}
}catch(e){}})();`;
}
