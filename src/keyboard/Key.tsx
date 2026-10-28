import { PropsWithChildren } from "react";
import BehaviorShortNames from "./behavior-short-names.json";

interface KeyProps {
  selected?: boolean;
  width: number;
  height: number;
  oneU: number;
  header?: string;
  onClick?: () => void;
  label?: string;
}

interface BehaviorShortName {
  short?: string;
}

const MAX_HEADER_LENGTH = 9;
const shortNames: Record<string, BehaviorShortName> = BehaviorShortNames;

const shortenHeader = (header: string | undefined) => {
  if(typeof header === "undefined"){
    return "";
  }
  // Empty string is a valid header for behaviors where we don't want to see a header, which is falsy
  // So we use an undefined check here
  if(typeof shortNames[header]?.short !== "undefined"){
    return shortNames[header].short;
  } else if(header.length > MAX_HEADER_LENGTH){
    const words = header.split(/[\s,-]+/);
    const lettersPerWord = Math.trunc(MAX_HEADER_LENGTH / words.length);
    return words.map((word) => (word.substring(0,lettersPerWord))).join("");
  } else {
    return header;
  }
}

export const Key = ({
  selected = false,
  width,
  height,
  oneU,
  header,
  onClick,
  label,
  children,
}: PropsWithChildren<KeyProps>) => {
  const pixelWidth = width * oneU - 2;
  const pixelHeight = height * oneU - 2;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label || header}
      className={`group rounded-md relative flex justify-center items-center cursor-pointer border border-solid transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "bg-primary text-primary-content border-primary ring-2 ring-primary ring-offset-2 ring-offset-base-300" : "bg-base-100 text-base-content border-base-content/20 hover:bg-base-200 hover:border-primary"}`}
      style={{
        width: `${pixelWidth}px`,
        height: `${pixelHeight}px`,
      }}
      onClick={onClick}
    >
      <div className={`absolute text-xs ${selected ? "text-primary-content" : "text-base-content"} opacity-80 top-1 text-nowrap left-1/2 font-light -translate-x-1/2 text-center`}>{shortenHeader(header)}</div>
      {children}
    </button>
  );
};
