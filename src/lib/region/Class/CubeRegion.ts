import { Vector, world } from '@minecraft/server'
import { Region } from 'lib/region/Class/Region'
import { REGION_DB } from 'lib/region/DB'

export class CubeRegion extends Region {
  /**
   * @param {Vector3} blockLocation
   * @param {Dimensions} dimensionId
   * @returns {CubeRegion | undefined}
   */
  static blockLocationInRegion(blockLocation: Vector3, dimensionId: Dimensions): CubeRegion | undefined {
    const region = Region.regionInstancesOf(this).find(
      region => region.dimensionId === dimensionId && region.vectorInRegion(blockLocation),
    )

    if (region instanceof CubeRegion) return region
  }

  /** @type {VectorXZ} */
  from: VectorXZ

  /** @type {VectorXZ} */
  to: VectorXZ

  /**
   * Creates a new region
   *
   * @param {object} o
   * @param {VectorXZ} o.from - The position of the first block of the region.
   * @param {VectorXZ} o.to - The position of the region's end.
   * @param {Dimensions} o.dimensionId - The dimension ID of the region.
   * @param {Partial<RegionPermissions>} [o.permissions] - An object containing the permissions for the region.
   * @param {string} [o.key] - The key of the region. This is used to identify the region.
   * @param {boolean} [o.creating] - Whether or not the region is being created.
   */
  constructor({
    from,
    to,
    dimensionId,
    permissions,
    key,
    creating = true,
  }: {
    from: VectorXZ
    to: VectorXZ
    dimensionId: Dimensions
    permissions?: Partial<RegionPermissions>
    key?: string
    creating?: boolean
  }) {
    super({ dimensionId, permissions, key })
    this.init({ permissions, creating }, CubeRegion)
    this.from = from
    this.to = to

    if (creating) {
      this.update()

      Region.regions.push(this)
    }
  }

  vectorInRegion(vector: Vector3, dimension = world.overworld) {
    return Vector.between(
      { x: this.from.x, y: dimension.heightRange.max, z: this.from.z },
      { x: this.to.x, y: dimension.heightRange.min, z: this.to.z },
      vector,
    )
  }

  update() {
    return (REGION_DB[this.key] = {
      ...super.update(),
      t: 'c',
      key: this.key,
      from: this.from,
      to: this.to,
    })
  }
}