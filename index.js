const sodium = require('sodium-universal')
const b4a = require('b4a')
const fs = require('fs')
const os = require('os')
const path = require('path')

module.exports = class Hyperkeys {
  constructor (opts = {}) {
    this.dir = opts.dir || Hyperkeys.dir || path.join(os.homedir(), '.hyperkeys')

    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true })
    }
  }

  create (name) {
    if (!name) throw new Error('Name is required')

    const exists = this.exists(name)
    if (exists.publicKey) throw new Error('The public key already exists (' + exists.publicKey + ')')
    if (exists.secretKey) throw new Error('The secret key already exists (' + exists.secretKey + ')')
    if (exists.seedKey) throw new Error('The seed key already exists (' + exists.seedKey + ')')

    const filename = path.join(this.dir, name)
    const seed = Hyperkeys.seed()
    fs.writeFileSync(filename, seed, { flag: 'wx' })

    // + should add opts.mode where it saves the key pair (name.pub + name.sec)
    // another mode for all the files (name + name.pub + name.sec)
    // and just for the seed (name) which is the default
    /* ie. similar to this:
      hyperkeys.create(name)
      hyperkeys.set(name, hyperkeys.get(name)) */

    return seed
  }

  get (name) {
    if (Array.isArray(name)) {
      return name.map(k => this.get(k))
    }

    let { publicKey, secretKey, seedKey } = this.exists(name)
    if (publicKey) publicKey = fs.readFileSync(publicKey)
    if (secretKey) secretKey = fs.readFileSync(secretKey)
    if (seedKey) seedKey = fs.readFileSync(seedKey)

    if (seedKey) {
      const keys = Hyperkeys.keyPair(seedKey)

      if (!publicKey) publicKey = keys.publicKey
      else if (Buffer.compare(publicKey, keys.publicKey) !== 0) throw new Error('publicKey from seed derivation is different')

      if (!secretKey) secretKey = keys.secretKey
      else if (Buffer.compare(secretKey, keys.secretKey) !== 0) throw new Error('secretKey from seed derivation is different')
    }

    return { publicKey, secretKey, seedKey }
  }

  set (name, keys = {}) {
    if (!name) throw new Error('Name is required')

    const filename = path.join(this.dir, name)

    if (keys.publicKey) fs.writeFileSync(filename + '.pub', keys.publicKey)
    if (keys.secretKey) fs.writeFileSync(filename + '.sec', keys.secretKey)
    if (keys.seedKey) fs.writeFileSync(filename, keys.seedKey)
  }

  exists (name) {
    // if (!name) throw new Error('Name is required')
    if (!name) return { publicKey: null, secretKey: null, seedKey: null }

    const filename = path.join(this.dir, name)

    const publicKey = fileExists(filename + '.pub') || null
    const secretKey = fileExists(filename + '.sec') || null
    const seedKey = fileExists(filename) || null

    return { publicKey, secretKey, seedKey }
  }

  remove (name) {
    const { publicKey, secretKey, seedKey } = this.exists(name)

    if (publicKey) fs.unlinkSync(publicKey)
    if (secretKey) fs.unlinkSync(secretKey)
    if (seedKey) fs.unlinkSync(seedKey)

    // return { publicKey: !!publicKey, secretKey: !!secretKey, seedKey: !!seedKey }
  }

  list () {
    const files = getFiles(this.dir)
    const cache = {}

    const keyPairs = []
    const knownKeys = []

    for (let name of files) {
      if (name.endsWith('.pub') || name.endsWith('.sec')) {
        name = name.substring(0, name.length - 4)
      }

      if (cache[name]) continue
      if (!cache[name]) cache[name] = true

      const keys = this.get(name)

      if (keys.publicKey && keys.secretKey) {
        keyPairs.push({ name, ...keys })
      } else if (!keys.secretKey && !keys.seedKey) {
        knownKeys.push({ name, ...keys })
      }
    }

    return { keyPairs, knownKeys }
  }

  static keyTriad (seedKey) {
    seedKey = seedKey || Hyperkeys.seed()
    const keyPair = Hyperkeys.keyPair(seedKey)
    return { ...keyPair, seedKey }
  }

  static keyPair (seed) {
    const publicKey = b4a.alloc(32)
    const secretKey = b4a.alloc(64)
    if (seed) sodium.crypto_sign_seed_keypair(publicKey, secretKey, seed)
    else sodium.crypto_sign_keypair(publicKey, secretKey)
    return { publicKey, secretKey }
  }

  static seed () {
    const seed = b4a.allocUnsafe(32)
    sodium.randombytes_buf(seed)
    return seed
  }

  /* static hash (data) {
    const out = b4a.allocUnsafe(32)
    sodium.crypto_generichash(out, data)
    return out
  } */
}

function fileExists (filename) {
  return fs.existsSync(filename) ? filename : ''
}

function getFiles (source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name)
}
