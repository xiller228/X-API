import { EquipmentSlot, system, world } from '@minecraft/server'
import { MinecraftBlockTypes } from '@minecraft/vanilla-data.js'
import { ModalForm } from 'smapi.js'
import { WorldEditTool } from '../class/Tool.js'
import {
  blockSetDropdown,
  getBlockSet,
  stringifyBlocksSetRef,
} from '../utils/blocksSet.js'

const nylium = new WorldEditTool({
  name: 'nylium',
  displayName: 'слуйчайный блок из набора',
  itemStackId: MinecraftBlockTypes.WarpedNylium,
  loreFormat: {
    version: 2,

    /** @type {[string, string]} */
    blocksSet: ['', ''],
  },
  editToolForm(slot, player) {
    const lore = nylium.parseLore(slot.getLore())
    new ModalForm('§3' + this.displayName)
      .addDropdown('Набор блоков', ...blockSetDropdown(lore.blocksSet, player))
      .show(player, (_, blocksSet) => {
        lore.blocksSet = [player.id, blocksSet]
        slot.nameTag = '§r§3> §f' + blocksSet
        slot.setLore(nylium.stringifyLore(lore))
        player.tell('§3> §fНабор блоков сменен на ' + blocksSet)
      })
  },
})

/* Replaces the block with a random block from the lore of the item. */
world.afterEvents.playerPlaceBlock.subscribe(({ block, player }) => {
  if (
    player.getComponent('equippable').getEquipmentSlot(EquipmentSlot.Mainhand)
      .typeId !== nylium.itemId
  )
    return

  system.delay(() => {
    const slot = player.mainhand()
    const lore = nylium.parseLore(slot.getLore())
    const blocksSet = getBlockSet(lore.blocksSet)

    if (blocksSet.length) {
      player.dimension
        .getBlock(block.location)
        ?.setPermutation(blocksSet.randomElement())
    } else {
      player.tell(
        `§cПустой набор блоков '§f${stringifyBlocksSetRef(
          lore.blocksSet
        )}'§c! Выберите другой.`
      )
      nylium.editToolForm?.(slot, player)
    }
  })
})