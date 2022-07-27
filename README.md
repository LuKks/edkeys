# hyperkeys

Node.js library for ed25519 keys management.

![](https://img.shields.io/npm/v/hyperkeys.svg) ![](https://img.shields.io/npm/dt/hyperkeys.svg) ![](https://img.shields.io/badge/tested_with-tape-e683ff.svg) ![](https://img.shields.io/github/license/LuKks/hyperkeys.svg)

```
npm i hyperkeys
```

By default it saves the files in `~/.hyperkeys`.

## Usage
```javascript
const Hyperkeys = require('hyperkeys')

const hyperkeys = new Hyperkeys()

const seed = hyperkeys.create(name)
const { publicKey, secretKey, seedKey } = hyperkeys.get(name)

hyperkeys.set(name, { publicKey, secretKey, seedKey })

const paths = hyperkeys.exists(name)

hyperkeys.remove(name)

const { keyPairs, knownKeys } = hyperkeys.list()

Hyperkeys.keyTriad() // => { publicKey, secretKey, seedKey }
```

## Dir
```javascript
const hyperkeys = new Hyperkeys({ dir: '/home/user/.another-folder' })
```

## Global dir
```javascript
Hyperkeys.dir = '/home/user/.global-folder'

// Now all instances uses that global directory
const hyperkeys1 = new Hyperkeys()

// Setting a specific dir overrides the global
const hyperkeys2 = new Hyperkeys({ dir: '/home/user/.override-folder' })
```

## Create
```javascript
// Writes the file to disk: ~/.hyperkeys/crst
const seedKey = hyperkeys.create('crst')
```

If you try to create twice with the same name it will throw an error.

## Get
If you have the `seedKey` then it will return all the keys.\
That's because you can derivate the public and secret keys from the seed.

```javascript
const keys = hyperkeys.get('crst')
// => { publicKey, secretKey, seedKey }
```

If you only have the `publicKey` then that's what you'll get.

```javascript
const keys = hyperkeys.get('friend')
// => { publicKey, secretKey: null, seedKey: null }
```

## Set
You can force to save any key to a specific name.

```javascript
hyperkeys.set('friend', { publicKey: Buffer<newer public key> })
```

Another example:

```javascript
// As previously said, this will save only the seedKey to disk
hyperkeys.create('vm1')

// You can use "get" to retrieve and generate all the corresponding keys
const keys = hyperkeys.get('vm1')

// And force save them
hyperkeys.set('vm1', keys)

// Now you have those files saved:
// publicKey: ~/.hyperkeys/vm1.pub
// secretKey: ~/.hyperkeys/vm1.sec
// seedKey: ~/.hyperkeys/vm1
```

## Exists
It will return the keys filepath linked to the name.

```javascript
hyperkeys.create('vm2')
const exists = hyperkeys.exists('vm2')
// => { publicKey: null, secretKey: null, seedKey: '/home/user/...' }
```

```javascript
// Again, with this we have explicitly all the keys in disk
hyperkeys.create('vm3')
hyperkeys.set('vm3', hyperkeys.get('vm3'))

const exists = hyperkeys.exists('vm3')
// => { publicKey: '/home/user/...', secretKey: '/home/user/...', seedKey: '/home/user/...' }
```

```javascript
const exists = hyperkeys.exists('non-existent')
// => { publicKey: null, secretKey: null, seedKey: null }
```

## Remove
It will remove all the keys, be it `publicKey`, `secretKey` and/or `seedKey`.

```javascript
hyperkeys.remove('vm1')
```

## List
`keyPairs` is when you have the `seedKey` or combination of `publicKey` and `secretKey`.\
`knownKeys` are the keys where you don't have either the `secretKey` and `seedKey`.

```javascript
const { keyPairs, knownKeys } = hyperkeys.list()
// keyPairs => [{ name, publicKey, secretKey, seedKey }, ...]
// knownKeys => [{ name, publicKey, secretKey: null, seedKey: null }, ...]
```

Note: If you only have the `secretKey` file (.sec) it will not show up on the list.\
It may be possible to derive the `publicKey` from the `secretKey` but not done for now.

## keyTriad (static)
```javascript
const keyTriad = Hyperkeys.keyTriad()
// => { publicKey, secretKey, seedKey }
```

## keyPair (static)
```javascript
const keyPair = Hyperkeys.keyPair()
// => { publicKey, secretKey }
```

## seed (static)
```javascript
const seed = Hyperkeys.seed()
// => Buffer<32 random bytes>
```

## License
MIT
