#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { author, name, version } from "~/package.json"
import sharp from "sharp"

const helpMessage = `Version:
  ${name}@${version}

Usage:
  $ ${name} <command> [options]

Commands:
  svgl
  remixicons

Options:
  -d, --download Download icons
  -v, --version  Display version
  -h, --help     Display help for <command>

Author:
  ${author.name} <${author.email}> (${author.url})`

const parse: typeof parseArgs = (config) => {
  try {
    return parseArgs(config)
  } catch (err: any) {
    throw new Error(`Error parsing arguments: ${err.message}`)
  }
}

const main = async () => {
  try {
    const args = process.argv.slice(2)

    const { positionals, values } = parse({
      allowPositionals: true,
      options: {
        convert: { type: "boolean", short: "c" },
        download: { type: "boolean", short: "d" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    })

    if (!args.length) throw new Error(helpMessage)

    if (!positionals.length) {
      if (values.version) {
        console.log(`${name}@${version}`)
        process.exit(0)
      }
      if (values.help) {
        console.log(helpMessage)
        process.exit(0)
      }
    }

    if (positionals[0] === "svgl") {
      if (values.download) {
        const res = await fetch("https://api.svgl.app")
        let data = await res.json()
        data = data
          .map((item: any) => {
            item = [item.route, item.wordmark].filter((i: any) => i)
            item = item
              .map((i: any) =>
                typeof i === "object" ? Object.keys(i).map((key) => i[key]) : i,
              )
              .flat()
            return item.flat()
          })
          .flat()
          .sort()
        await fs.promises.mkdir(path.join(process.cwd(), "icons/svg/svgl"), {
          recursive: true,
        })
        for (const item of data) {
          try {
            const res = await fetch(item)
            console.log(res.status, item.split("/").pop())
            const file = await res.text()
            const fileName = item.split("/").pop()
            await fs.promises.writeFile(
              path.join(process.cwd(), "icons/svg/svgl", fileName),
              file,
            )
          } catch {
            console.error(`Failed to download ${item}`)
          }
        }
        console.log("Download complete")
        process.exit(0)
      }
      if (values.convert) {
        const files = await fs.promises.readdir(
          path.join(process.cwd(), "icons/svg/svgl"),
        )
        await fs.promises.mkdir(path.join(process.cwd(), `icons/png/svgl`), {
          recursive: true,
        })
        for (const file of files) {
          try {
            const input = path.join(process.cwd(), "icons/svg/svgl", file)
            const output = path.join(
              `icons/png/svgl`,
              file.replace(".svg", ".png"),
            )
            await sharp(input, {
              density: 300,
            })
              .png()
              .toFile(output)
            if (!file.includes("wordmark")) {
              const sizes = [24, 48, 64, 128]
              for (const size of sizes) {
                const output = path.join(
                  process.cwd(),
                  "icons/png/svgl",
                  file.replace(".svg", `-${size.toString()}.png`),
                )
                await sharp(input, {
                  density: 300,
                })
                  .resize(size)
                  .png()
                  .toFile(output)
              }
            }
            console.log(`Converted ${file}`)
          } catch {
            console.error(`Failed to convert ${file}`)
          }
        }
        console.log("Conversion complete")
        process.exit(0)
      }
      process.exit(0)
    }

    if (positionals[0] === "remixicons") {
      if (values.convert) {
        const convertFiles = async (dir: string, type: string) => {
          const files = await fs.promises.readdir(path.join(process.cwd(), dir))
          await fs.promises.mkdir(
            path.join(process.cwd(), "icons/png/remixicons"),
            { recursive: true },
          )
          for (const file of files) {
            try {
              let input = path.join(process.cwd(), dir, file)
              const white = path.join(
                process.cwd(),
                "icons/png/remixicons",
                file.replace(".svg", `-${type}.png`),
              )
              const black = path.join(
                process.cwd(),
                "icons/png/remixicons",
                file.replace(".svg", `-${type}-dark.png`),
              )
              const inputLight = Buffer.from(
                (await fs.promises.readFile(input, "utf-8")).replace(
                  /currentColor/g,
                  "#ffffff",
                ),
              )
              const inputDark = Buffer.from(
                (await fs.promises.readFile(input, "utf-8")).replace(
                  /currentColor/g,
                  "#000000",
                ),
              )
              await sharp(inputLight, {
                density: 300,
              })
                .png()
                .toFile(white)
              await sharp(inputDark, {
                density: 300,
              })
                .png()
                .toFile(black)
              const sizes = [24, 48, 64, 128, 256, 512]
              for (const size of sizes) {
                const whiteOutput = path.join(
                  process.cwd(),
                  "icons/png/remixicons",
                  file.replace(".svg", `-${type}-${size}.png`),
                )
                const blackOutput = path.join(
                  process.cwd(),
                  "icons/png/remixicons",
                  file.replace(".svg", `-${type}-dark-${size}.png`),
                )
                await sharp(inputLight, {
                  density: 300,
                })
                  .resize(size)
                  .png()
                  .toFile(whiteOutput)
                await sharp(inputDark, {
                  density: 300,
                })
                  .resize(size)
                  .png()
                  .toFile(blackOutput)
              }
              console.log(`Converted ${file}`)
            } catch (e) {
              console.error(`Failed to convert ${file}`, e)
            }
          }
        }
        await convertFiles("node_modules/remixicons/fill", "fill")
        await convertFiles("node_modules/remixicons/line", "line")
        console.log("Conversion complete")
        process.exit(0)
      }
    }

    console.error(`unknown command: ${args.join(" ")}`)
    process.exit(0)
  } catch (err: any) {
    console.error(helpMessage)
    console.error(`\n${err.message}\n`)
    process.exit(1)
  }
}

main()
