import { Player } from '@minecraft/server'
import { WeakPlayerMap } from 'lib/weak-player-storage'
import { type Text, t } from '../text'

/** Creates new logger that will use name as prefix and will output info to the console */
export function createLogger(name: string) {
  name = name.startsWith('§9[') ? name : `§9[${name}] `
  return {
    debug: createLevel(name, 'debug', debug),
    info: createLevel(name, 'info', info),
    error: createLevel(name, 'error', error),
    warn: createLevel(name, 'warn', warn),
    player: (player: Player) => {
      const newName = `${name.trimEnd()}[§f${player.name}§9] `
      const cache = playerLoggers.get(newName)
      if (cache) {
        return cache
      } else {
        const logger = createLogger(newName)
        playerLoggers.set(newName, logger)
        return logger
      }
    },
  }
}

type Logger = ReturnType<typeof createLogger>

const playerLoggers = new WeakPlayerMap<Logger>()

const debug = t.options({ unit: '§l§6', text: '§f' })
const info = t
const warn = t.warn
const error = t.error

function createLevel(name: string, level: 'debug' | 'error' | 'info' | 'warn', text: Text.Static | Text.Function) {
  return (t: unknown, ...args: unknown[]) => {
    if (isTemplateStringsArray(t)) {
      console[level](name + (text as unknown as Text.Function)(t, ...args))
    } else {
      console[level](name, t, ...args)
    }
  }
}

function isTemplateStringsArray(a: unknown): a is TemplateStringsArray {
  return (
    Array.isArray(a) &&
    a.every(e => typeof e === 'string') &&
    'raw' in a &&
    Array.isArray(a.raw) &&
    a.raw.every(e => typeof e === 'string')
  )
}