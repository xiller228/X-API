import { world } from '@minecraft/server'
import { Vector } from 'lib'
import { CUSTOM_ITEMS } from 'lib/assets/config'

world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
  if (itemStack.typeId === CUSTOM_ITEMS.dash) {
    source.teleport(Vector.add(source.location, Vector.multiply(source.getViewDirection(), 5)))
  }
})