import path from "node:path";
import fsp from "node:fs/promises";

import { optimize, createContentItem } from "svgo";

let INPUT_DIR = path.join(process.cwd(), "icons");

let OUTPUT_DIR = path.join(process.cwd(), "app/assets");

async function wrapSymbol(inputPath, outputDir) {
  let ext = path.extname(inputPath);
  let base = path.basename(inputPath, ext);
  let content = await fsp.readFile(inputPath, "utf-8");
  let outputPath = path.join(outputDir, `${base}.svg`);

  let result = optimize(content, {
    path: inputPath,
    plugins: [
      {
        name: "preset-default",
      },
      {
        name: "removeViewBox",
        active: false,
      },
      {
        name: "removeDimensions",
        active: true,
      },
      {
        name: "wrapInSymbol",
        type: "perItem",
        fn(item) {
          if (item.type === "element" && item.name === "svg") {
            let { xmlns, ...attributes } = item.attributes;

            // remove all attributes from parent svg element
            for (let attribute in attributes) {
              if (Object.hasOwn(attributes, attribute)) {
                delete item.attributes[attribute];
              }
            }

            let children = item.children;

            // add parent's attributes to new symbol child
            item.children = [
              createContentItem({
                type: "element",
                name: "symbol",
                attributes: { ...attributes, id: base },
                children,
              }),
            ];
          }
        },
      },
    ],
  });

  let optimizedSvgString = result.data;

  return fsp.writeFile(outputPath, optimizedSvgString);
}

async function compile() {
  // 1. verify all output directories exist
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  // 2. get all svg icons
  let icons = await fsp.readdir(INPUT_DIR);

  // 3. generate icons
  await icons.map((icon) => {
    return wrapSymbol(path.join(INPUT_DIR, icon), OUTPUT_DIR);
  });
}

compile();
