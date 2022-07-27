const tape = require('tape')
const Hyperkeys = require('./')
const fs = require('fs')
const path = require('path')
const os = require('os')

const dir = path.join(os.homedir(), '.hyperkeys-test')
// + should delete the folder before and after running tests

tape('default dir', async function (t) {
  const hyperkeys = new Hyperkeys()
  t.is(hyperkeys.dir, path.join(os.homedir(), '.hyperkeys'))
})

tape('custom dir', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })
  t.is(hyperkeys.dir, dir)
})

tape('global dir', async function (t) {
  Hyperkeys.dir = dir

  const hyperkeys = new Hyperkeys()
  t.is(hyperkeys.dir, Hyperkeys.dir)

  Hyperkeys.dir = undefined
})

tape('basic', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  t.is(existsSync(hyperkeys, name), false)

  const seed = hyperkeys.create(name)
  t.is(existsSync(hyperkeys, name), true)

  const got = hyperkeys.get(name)
  t.is(got.publicKey.length, 32)
  t.is(got.secretKey.length, 64)
  t.is(got.seedKey.length, 32)
  t.is(Buffer.compare(got.seedKey, seed), 0)

  hyperkeys.remove(name)
  t.is(existsSync(hyperkeys, name), false)
})

tape('create without name', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  try {
    hyperkeys.create()
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.is(error.message, 'Name is required')
  }
})

tape('create but keys already exists', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const { publicKey, secretKey, seedKey } = Hyperkeys.keyTriad()

  // publicKey
  hyperkeys.set(name, { publicKey })
  try {
    hyperkeys.create(name)
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.ok(error.message.indexOf('The public key already exists') === 0)
  }
  hyperkeys.remove(name)

  // secretKey
  hyperkeys.set(name, { secretKey })
  try {
    hyperkeys.create(name)
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.ok(error.message.indexOf('The secret key already exists') === 0)
  }
  hyperkeys.remove(name)

  // seedKey
  hyperkeys.set(name, { seedKey })
  try {
    hyperkeys.create(name)
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.ok(error.message.indexOf('The seed key already exists') === 0)
  }
  hyperkeys.remove(name)
})

tape('set without name', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const seedKey = Hyperkeys.seed()

  try {
    hyperkeys.set('', { seedKey })
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.is(error.message, 'Name is required')
  }
})

tape('set publicKey', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const keyPair = Hyperkeys.keyPair()

  hyperkeys.set(name, { publicKey: keyPair.publicKey })
  const got = hyperkeys.get(name)
  t.is(got.publicKey.length, 32)
  t.is(got.secretKey, null)
  t.is(got.seedKey, null)
  t.is(Buffer.compare(got.publicKey, keyPair.publicKey), 0)

  hyperkeys.remove(name)
})

tape('set secretKey', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const keyPair = Hyperkeys.keyPair()

  hyperkeys.set(name, { secretKey: keyPair.secretKey })
  const got = hyperkeys.get(name)
  t.is(got.publicKey, null)
  t.is(got.secretKey.length, 64)
  t.is(got.seedKey, null)
  t.is(Buffer.compare(got.secretKey, keyPair.secretKey), 0)

  hyperkeys.remove(name)
})

tape('set seedKey', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const { publicKey, secretKey, seedKey } = Hyperkeys.keyTriad()

  hyperkeys.set(name, { seedKey })
  const got = hyperkeys.get(name)
  t.is(got.publicKey.length, 32)
  t.is(got.secretKey.length, 64)
  t.is(got.seedKey.length, 32)
  t.is(Buffer.compare(got.publicKey, publicKey), 0)
  t.is(Buffer.compare(got.secretKey, secretKey), 0)
  t.is(Buffer.compare(got.seedKey, seedKey), 0)

  hyperkeys.remove(name)
})

tape('get multiples', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name1 = Hyperkeys.seed().toString('hex')
  const name2 = Hyperkeys.seed().toString('hex')

  hyperkeys.create(name1)
  hyperkeys.create(name2)

  const all = hyperkeys.get([name1, name2])
  t.is(all.length, 2)
  t.deepEqual(Object.keys(all[0]), ['publicKey', 'secretKey', 'seedKey'])
  t.deepEqual(Object.keys(all[1]), ['publicKey', 'secretKey', 'seedKey'])

  hyperkeys.remove(name1)
  hyperkeys.remove(name2)
})

tape('get but derivation conflict', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const keyPair = Hyperkeys.keyPair()

  // this will store the seed key
  hyperkeys.create(name)

  // no problem whatsoever
  hyperkeys.get(name)

  // this will force to save some random keys that are not linked to the seed
  // it could have been another program or an user manually edited the files
  hyperkeys.set(name, { secretKey: keyPair.secretKey })
  try {
    hyperkeys.get(name)
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.is(error.message, 'secretKey from seed derivation is different')
  }

  hyperkeys.set(name, { publicKey: keyPair.publicKey })

  try {
    hyperkeys.get(name)
    t.ok(false, 'Should have given error')
  } catch (error) {
    t.is(error.message, 'publicKey from seed derivation is different')
  }

  hyperkeys.remove(name)
})

tape('exists without name', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const exists = hyperkeys.exists('')
  t.is(exists.publicKey, null)
  t.is(exists.secretKey, null)
  t.is(exists.seedKey, null)
})

tape('exists', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const { publicKey, secretKey, seedKey } = Hyperkeys.keyTriad()

  // before creation
  const exists1 = hyperkeys.exists(name)
  t.is(exists1.publicKey, null)
  t.is(exists1.secretKey, null)
  t.is(exists1.seedKey, null)

  hyperkeys.set(name, { publicKey, secretKey, seedKey })

  // after creation
  const exists2 = hyperkeys.exists(name)
  t.is(exists2.publicKey, path.join(dir, name + '.pub'))
  t.is(exists2.secretKey, path.join(dir, name + '.sec'))
  t.is(exists2.seedKey, path.join(dir, name))

  hyperkeys.remove(name)
})

tape('remove', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')
  const { publicKey, secretKey, seedKey } = Hyperkeys.keyTriad()

  hyperkeys.set(name, { publicKey })
  t.is(existsSync(hyperkeys, name + '.pub'), true)
  hyperkeys.remove(name)
  t.is(existsSync(hyperkeys, name + '.pub'), false)

  hyperkeys.set(name, { secretKey })
  t.is(existsSync(hyperkeys, name + '.sec'), true)
  hyperkeys.remove(name)
  t.is(existsSync(hyperkeys, name + '.sec'), false)

  hyperkeys.set(name, { seedKey })
  t.is(existsSync(hyperkeys, name), true)
  hyperkeys.remove(name)
  t.is(existsSync(hyperkeys, name), false)
})

tape('remove non-existent', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name = Hyperkeys.seed().toString('hex')

  t.is(existsSync(hyperkeys, name), false)
  hyperkeys.remove(name)
  t.is(existsSync(hyperkeys, name), false)
})

tape('list empty', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const { keyPairs, knownKeys } = hyperkeys.list()
  t.is(keyPairs.length, 0)
  t.is(knownKeys.length, 0)
})

tape('list', async function (t) {
  const hyperkeys = new Hyperkeys({ dir })

  const name1 = '01' + Hyperkeys.seed().toString('hex')
  const name2 = '02' + Hyperkeys.seed().toString('hex')
  const name3 = '03' + Hyperkeys.seed().toString('hex')
  const name4 = '04' + Hyperkeys.seed().toString('hex')
  const name5 = '05' + Hyperkeys.seed().toString('hex')

  const keyTriad1 = Hyperkeys.keyTriad()
  const keyTriad2 = Hyperkeys.keyTriad()
  const keyTriad3 = Hyperkeys.keyTriad()
  const keyTriad4 = Hyperkeys.keyTriad()
  // const keyTriad5 = Hyperkeys.keyTriad()

  // key pairs
  hyperkeys.set(name1, { seedKey: keyTriad1.seedKey })
  hyperkeys.set(name2, { publicKey: keyTriad2.publicKey, secretKey: keyTriad2.secretKey })

  // known keys
  hyperkeys.set(name3, { publicKey: keyTriad3.publicKey })
  hyperkeys.set(name4, { publicKey: keyTriad4.publicKey })

  // invalid, should not show up in the list because only has a secret key
  // + research if I can derivate public key using only the secret key
  hyperkeys.set(name5, { secretKey: keyTriad4.secretKey })

  const { keyPairs, knownKeys } = hyperkeys.list()
  t.is(keyPairs.length, 2)
  t.is(knownKeys.length, 2)

  t.deepEqual(Object.values(keyPairs[0]), [name1, keyTriad1.publicKey, keyTriad1.secretKey, keyTriad1.seedKey])
  t.deepEqual(Object.values(keyPairs[1]), [name2, keyTriad2.publicKey, keyTriad2.secretKey, null])

  t.deepEqual(Object.values(knownKeys[0]), [name3, keyTriad3.publicKey, null, null])
  t.deepEqual(Object.values(knownKeys[1]), [name4, keyTriad4.publicKey, null, null])

  hyperkeys.remove(name1)
  hyperkeys.remove(name2)
  hyperkeys.remove(name3)
  hyperkeys.remove(name4)
  hyperkeys.remove(name5)
})

function existsSync ({ dir }, name) {
  return fs.existsSync(path.join(dir, name))
}
