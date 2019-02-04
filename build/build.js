const fs = require('fs')
const rollup = require('rollup')
const terser = require('terser')
const path = require('path')

const resolve = p => {
  return path.resolve(__dirname, '../', p)
}

const inputOptions = {
  input: resolve('src/index.js')
}
const outputOptions = {
  file: resolve('dist/bt.js'),
  format: 'umd',
  name: 'bt',
}

async function build() {
  const bundle = await rollup.rollup(inputOptions)

  const { output } = await bundle.generate(outputOptions)

  await bundle.write(outputOptions)

  const code = output[0].code
  const minified = terser.minify(code).code
  await new Promise((resolve, reject) => {
    fs.writeFile(outputOptions.file.replace(/\.js$/, '.min.js'), minified, err => {
      if (err) return reject(err)

      resolve()
    })
  })
}

build()