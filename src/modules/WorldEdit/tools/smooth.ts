import { Block, BlockPermutation, Player, Vector, world } from '@minecraft/server'

import { MinecraftBlockTypes } from '@minecraft/vanilla-data'
import { ModalForm, is, util } from 'lib'
import { CUSTOM_ITEMS } from 'lib/assets/config'
import { WorldEdit } from 'modules/WorldEdit/lib/WorldEdit'
import { BlocksSetRef, SHARED_POSTFIX, getAllBlocksSets } from 'modules/WorldEdit/utils/blocksSet'
import { BaseBrushTool } from '../lib/BaseBrushTool'

type SmoothProps = {
  smoothLevel: number
}

// TODO Cache invalidation

class SmoothTool extends BaseBrushTool<SmoothProps> {
  onBrushUse: BaseBrushTool<SmoothProps>['onBrushUse'] = (player, lore, hit) => {
    smoothVoxelData(player, hit.block, lore.size, lore.smoothLevel).catch(util.error)
  }
}

const smoother = new SmoothTool({
  name: 'smoother',
  displayName: 'сглаживание',
  itemStackId: CUSTOM_ITEMS.brush,
  loreFormat: {
    version: 2,

    replaceBlocksSet: ['', ''] as BlocksSetRef,
    type: 'smoother',
    smoothLevel: 1,
    size: 1,
    maxDistance: 300,
  },

  editToolForm(slot, player) {
    const lore = smoother.parseLore(slot.getLore())

    void new ModalForm('§3Сглаживание')

      .addSlider('Размер', 1, is(player.id, 'grandBuilder') ? 20 : 10, 1, lore.size)
      .addSlider('Сила сглаживания', 1, is(player.id, 'grandBuilder') ? 20 : 10, 1, lore.smoothLevel)
      .addDropdownFromObject(
        'Заменяемый набор блоков',
        Object.fromEntries(Object.keys(getAllBlocksSets(player.id)).map(e => [e, e])),
        {
          defaultValue: lore.replaceBlocksSet[1],
          none: true,
          noneText: 'Любой',
        },
      )

      .show(player, (ctx, size, smoothLevel, replaceBlocksSet) => {
        lore.size = size

        lore.smoothLevel = smoothLevel

        if (replaceBlocksSet) lore.replaceBlocksSet = [player.id, replaceBlocksSet]
        slot.nameTag = '§r§3Сглаживание §6' + size
        '§r §f' + (replaceBlocksSet ? replaceBlocksSet.replace(SHARED_POSTFIX, '') : '')

        slot.setLore(smoother.stringifyLore(lore))
        player.success(
          `${
            lore.replaceBlocksSet[0] ? 'Отредактирована' : 'Создана'
          } сглаживатель размером ${size} и силой ${smoothLevel}${
            replaceBlocksSet ? `, заменяемым набором блоков ${replaceBlocksSet}` : ''
          } и радиусом ${size}`,
        )
      })
  },
})

export async function smoothVoxelData(
  player: Player,
  baseBlock: Block,
  radius: number,
  smoothLevel: number,
  replaceBlocks: (import('modules/WorldEdit/menu').ReplaceTarget | undefined)[] = [undefined],
) {
  const pos1 = Vector.add(baseBlock, { x: radius, y: radius, z: radius })
  const pos2 = Vector.add(baseBlock, { x: -radius, y: -radius, z: -radius })

  WorldEdit.forPlayer(player).backup('Сглаживание', pos1, pos2)

  const prefix = '§7Сглаживание: §f '

  player.info(prefix + 'Вычисление...')
  // Create a copy of the voxel data
  const voxelDataCopy = getBlocksAreasData(baseBlock, radius)

  /** @type {BlockCacheMatrix<Pick<BlockCache, 'location' | 'permutation'>>} */
  const setBlocks: BlockCacheMatrix<Pick<BlockCache, 'location' | 'permutation'>> = {}

  const sizeX = voxelDataCopy.length
  const sizeY = voxelDataCopy[0].length
  const sizeZ = voxelDataCopy[0][0].length
  let operations = 0
  for (let smooth = 0; smooth <= smoothLevel; smooth++) {
    // Apply smoothing
    for (let x = 1; x < sizeX - 1; x++) {
      for (let y = 1; y < sizeY - 1; y++) {
        for (let z = 1; z < sizeZ - 1; z++) {
          let sum = 0
          const permutations = []
          const cache = voxelDataCopy[x][y][z]
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dz = -1; dz <= 1; dz++) {
                const { permutation, void: isVoid } = voxelDataCopy[x + dx][y + dy][z + dz]
                if (!isVoid) {
                  sum++
                  permutations.push(permutation)
                }
              }
            }
          }

          // If the sum is greater than the number of surrounding voxels / 2, set the voxel to solid
          if (sum > 13 && cache.void) {
            cache.permutation = permutations.randomElement()
            cache.void = false
          } else if (sum < 13 && !cache.void) {
            // If the sum is less than the number of surrounding voxels / 2, set the voxel to empty
            cache.permutation = undefined
            cache.void = true
          }

          if (sum !== 13) {
            setBlocks[cache.location.x] ??= {}

            setBlocks[cache.location.x][cache.location.y] ??= {}

            setBlocks[cache.location.x][cache.location.y][cache.location.z] = cache
          }
        }
        operations++

        if (operations % 100 === 0) {
          await nextTick
        }
      }
    }
  }

  const toFill = Object.values(setBlocks)

    .map(e => Object.values(e).map(e => Object.values(e)))
    .flat(2)

  player.info(
    prefix + `Будет заполнено §6${toFill.length} §f${util.ngettext(toFill.length, ['блок', 'блока', 'блоков'])}`,
  )

  operations = 0

  for (const e of toFill) {
    if (!e.location) continue

    const block = world.overworld.getBlock(e.location)

    if (e.permutation) block?.setPermutation(e.permutation)
    else block?.setType(MinecraftBlockTypes.Air)
    operations++

    if (operations % 100 === 0) {
      await nextTick
    }
  }
  player.success(prefix + 'Готово')
}

type BlockCache = {
  permutation: BlockPermutation | undefined
  location: Vector3
  void: boolean
}

type BlockCacheMatrix<MatrixValue extends object = BlockCache> = Record<
  string,
  Record<string, Record<string, MatrixValue>>
>

const BLOCK_CACHE: BlockCacheMatrix = {}

/**
 * @param {Block} block
 * @param {number} radius
 */

function getBlocksAreasData(block: Block, radius: number) {
  const datax: BlockCache[][][] = []
  for (let y = -radius, y2 = 0; y < radius; y++, y2++) {
    const datay = []
    for (let x = -radius, x2 = 0; x < radius; x++, x2++) {
      const dataz = []
      for (let z = -radius; z < radius; z++) {
        const location = Vector.add(block.location, { x, y, z })

        if (BLOCK_CACHE[location.x]?.[location.y]?.[location.z]) {
          dataz.push(BLOCK_CACHE[location.x]?.[location.y]?.[location.z])
          continue
        }

        let permutation,
          isAir = true,
          isLiquid = false,
          isSolid = true

        try {
          const b = block.offset({ x, y, z })
          if (b) ({ permutation, isAir, isLiquid, isSolid } = b)
        } catch (error) {
          util.error(error)
        }
        const newBlockData = {
          permutation,
          location,
          void: isAir || isLiquid || !isSolid,
        }
        dataz.push(newBlockData)

        BLOCK_CACHE[location.x] ??= {}

        BLOCK_CACHE[location.x][location.y] ??= {}

        BLOCK_CACHE[location.x][location.y][location.z] = newBlockData
      }
      datay.push(dataz)
    }
    datax.push(datay)
  }
  return datax
}