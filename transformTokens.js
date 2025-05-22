const StyleDictionary = require("style-dictionary");
const deepMerge = require("deepmerge");
const webConfig = require("./src/web/index.js");
const androidConfig = require("./src/android/index.js");

// Register transform for pixel values
StyleDictionary.registerTransform({
  name: "size/px",
  type: "value",
  matcher: (token) => {
    return (
      (token.unit === "pixel" || token.type === "dimension") &&
      token.value !== 0
    );
  },
  transformer: (token) => {
    return `${token.value}px`;
  },
});

// Register transform for percent values
StyleDictionary.registerTransform({
  name: "size/percent",
  type: "value",
  matcher: (token) => {
    return token.unit === "percent" && token.value !== 0;
  },
  transformer: (token) => {
    return `${token.value}%`;
  },
});

// Register a filter to ensure we only output valid tokens and exclude tokens with category "modes"
StyleDictionary.registerFilter({
  name: "validToken",
  matcher: function (token) {
    // Exclude tokens that belong to the "modes" category
    if (
      token.attributes &&
      token.attributes.category &&
      token.attributes.category.toLowerCase() === "modes"
    ) {
      return false;
    }
    return [
      "dimension",
      "string",
      "number",
      "color",
      "custom-spacing",
      "custom-gradient",
      "custom-fontStyle",
      "custom-radius",
      "custom-shadow",
    ].includes(token.type);
  },
});

// Override the default name transform ("name/cti/kebab")
// so that it removes the token's category (from token.attributes.category)
// from the final output name.
StyleDictionary.registerTransform({
  name: "name/cti/kebab",
  type: "name",
  matcher: () => true,
  transformer: function (token, options) {
    // Use token.path if available; otherwise, split token.name by '/'
    let parts =
      token.path && token.path.length
        ? token.path.slice()
        : token.name.split("/");
    // If token.attributes.category exists, remove any parts matching it
    if (token.attributes && token.attributes.category) {
      const category = token.attributes.category.toLowerCase();
      parts = parts.filter((part) => part.toLowerCase() !== category);
    }
    // Join the remaining parts with hyphens and return in lowercase
    return parts.join("-").toLowerCase();
  },
});

// Register transform for RGB values
StyleDictionary.registerTransform({
  name: "color/rgb",
  type: "value",
  matcher: (token) => token.type === "color",
  transformer: (token) => {
    let r, g, b;
    if (typeof token.value === "string" && token.value.startsWith("#")) {
      // HEX format
      const hex = token.value.replace("#", "");
      const bigint = parseInt(hex, 16);
      r = (bigint >> 16) & 255;
      g = (bigint >> 8) & 255;
      b = bigint & 255;
    } else if (
      typeof token.value === "string" &&
      token.value.startsWith("rgb(")
    ) {
      // rgb() format
      [r, g, b] = token.value
        .replace(/[^\d,]/g, "")
        .split(",")
        .map(Number);
    } else {
      // fallback
      r = g = b = 0;
    }
    return `${r}, ${g}, ${b}`;
  },
});

// Register a generic format for both RGB and HEX variables
StyleDictionary.registerFormat({
  name: "variables-with-rgb-and-hex",
  formatter: ({ dictionary }) => {
    const variables = dictionary.allTokens
      .map((token) => {
        // Only output -rgb for primitive colors
        const isPrimitive =
          token.type === "color" &&
          token.extensions &&
          token.extensions["org.lukasoppermann.figmaDesignTokens"] &&
          token.extensions["org.lukasoppermann.figmaDesignTokens"].collection === "Primitives";

        if (isPrimitive) {
          const rgbValue = StyleDictionary.transform["color/rgb"].transformer(token);
          return `  --${token.name}-rgb: ${rgbValue};\n  --${token.name}: ${token.value};`;
        }
        return `  --${token.name}: ${token.value};`;
      })
      .join("\n");
    return `:root {\n${variables}\n}`;
  },
});

// Register format for Less variables
StyleDictionary.registerFormat({
  name: "less/variables",
  formatter: ({ dictionary }) =>
    dictionary.allTokens
      .map((token) => `@${token.name}: ${token.value};`)
      .join("\n"),
});

// Register format for SCSS variables
StyleDictionary.registerFormat({
  name: "scss/variables",
  formatter: ({ dictionary }) =>
    dictionary.allTokens
      .map((token) => `$${token.name}: ${token.value};`)
      .join("\n"),
});

// Extend Style Dictionary with your custom configurations and token sources
const StyleDictionaryExtended = StyleDictionary.extend({
  ...deepMerge.all([androidConfig, webConfig]),
  source: ["tokens/*.json"],
  platforms: {
    scss: {
      transformGroup: "custom/css",
      buildPath: "build/scss/",
      files: [
        {
          destination: "_variables.scss",
          format: "scss/variables",
          filter: "validToken",
          options: {
            showFileHeader: true, // Remove header if desired
          },
        },
      ],
    },
    less: {
      transformGroup: "custom/css",
      buildPath: "build/less/",
      files: [
        {
          destination: "_variables.less",
          format: "less/variables",
          filter: "validToken",
          options: {
            showFileHeader: true, // Remove header if desired
          },
        },
      ],
    },
    css: {
      transformGroup: "custom/css",
      buildPath: "build/css/",
      files: [
        {
          destination: "_variables.css",
          format: "variables-with-rgb-and-hex",
          filter: "validToken",
          options: {
            showFileHeader: false,
          },
        },
      ],
    },
    "json-flat": {
      transformGroup: "js",
      buildPath: "build/json/",
      files: [
        {
          destination: "styles.json",
          format: "json/flat",
          filter: "validToken",
        },
      ],
    },
    ios: {
      transformGroup: "ios",
      buildPath: "build/ios/",
      files: [
        {
          destination: "StyleDictionaryColor.h",
          format: "ios/colors.h",
          className: "StyleDictionaryColor",
          type: "StyleDictionaryColorName",
          filter: { type: "color" },
        },
        {
          destination: "StyleDictionaryColor.m",
          format: "ios/colors.m",
          className: "StyleDictionaryColor",
          type: "StyleDictionaryColorName",
          filter: { type: "color" },
        },
        {
          destination: "StyleDictionarySize.h",
          format: "ios/static.h",
          className: "StyleDictionarySize",
          type: "float",
          filter: { type: "number" },
        },
        {
          destination: "StyleDictionarySize.m",
          format: "ios/static.m",
          className: "StyleDictionarySize",
          type: "float",
          filter: { type: "number" },
        },
      ],
    },
    "ios-swift-separate-enums": {
      transformGroup: "ios-swift-separate",
      buildPath: "build/ios-swift/",
      files: [
        {
          destination: "StyleDictionaryColor.swift",
          format: "ios-swift/enum.swift",
          className: "StyleDictionaryColor",
          filter: { type: "color" },
        },
        {
          destination: "StyleDictionarySize.swift",
          format: "ios-swift/enum.swift",
          className: "StyleDictionarySize",
          type: "float",
          filter: { type: "number" },
        },
      ],
    },
  },
});

// Build tokens for all configured platforms
StyleDictionaryExtended.buildAllPlatforms();