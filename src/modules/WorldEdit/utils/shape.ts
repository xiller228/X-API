import { BlockPermutation, Player, Vector, system } from '@minecraft/server'
import { util } from 'lib'
import { stringifyReplaceTargets, toReplaceTarget } from 'modules/WorldEdit/menu'
import { WE_CONFIG } from '../config'
import { Cuboid } from '../lib/Cuboid'
import { WorldEdit } from '../lib/WorldEdit'

/**
 * @example
 *   placeShape(DefaultModes.sphere, Location, ['stone', 'wood'], 10)
 *
 * @param player
 * @param shape Shape equation to caculate
 * @param pos Location to generate shape
 * @param blocks Blocks to use to fill block
 * @param replaceBlocks
 * @param size Size of sphere
 */
export function placeShape(
  player: Player,
  shape: string,
  pos: Vector3,
  size: number,
  blocks: BlockPermutation[],
  replaceBlocks: (import('modules/WorldEdit/menu').ReplaceTarget | undefined)[] = [undefined],
): string | undefined {
  if (replaceBlocks.length < 1) replaceBlocks.push(undefined)
  if (blocks.length < 1) return '§cПустой набор блоков'
  util.catch(async () => {
    const loc1 = { x: -size, y: -size, z: -size }
    const loc2 = { x: size, z: size, y: size }

    WorldEdit.forPlayer(player).backup(
      `§3Кисть §6${shape}§3, размер §f${size}§3, блоки: §f${stringifyReplaceTargets(blocks.map(toReplaceTarget))}`,
      Vector.add(pos, loc1),
      Vector.add(pos, loc2),
    )

    const cuboid = new Cuboid(loc1, loc2)
    const conditionFunction = new Function(
      'x, y, z, {xMin, xMax, yMin, yMax, zMin, zMax, xCenter, yCenter, zCenter, xRadius, yRadius, zRadius}, rad',
      `return ${shape}`,
    )

    const condition: (...args: number[]) => boolean = (x, y, z): boolean => conditionFunction(x, y, z, cuboid, size)

    let blocksSet = 0
    for (const { x, y, z } of Vector.foreach(loc1, loc2)) {
      if (!condition(x, y, z)) continue
      const location = Vector.add(pos, { x, y, z })
      const block = player.dimension.getBlock(location)
      for (const replaceBlock of replaceBlocks) {
        if (replaceBlock && !block?.permutation.matches(replaceBlock.typeId, replaceBlock.states)) continue

        block?.setPermutation(blocks.randomElement())

        blocksSet++

        if (blocksSet >= WE_CONFIG.BLOCKS_BEFORE_AWAIT) {
          await system.sleep(WE_CONFIG.TICKS_TO_SLEEP)
          blocksSet = 0
        }
      }
    }
  })
}