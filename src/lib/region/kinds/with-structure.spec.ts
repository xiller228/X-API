import { MinecraftBlockTypes } from '@minecraft/vanilla-data'
import { Vector } from 'lib/vector'
import { TestStructures } from 'test/constants'
import { suite, test } from 'test/framework'
import { SphereArea } from '../areas/sphere'
import { RegionWithStructure } from './with-structure'

class TestStructure extends RegionWithStructure {}

suite('RegionWithStructure', () => {
  test('should save and load structure only with region blocks', async test => {
    const region = TestStructure.create(
      new SphereArea({ center: test.worldLocation(new Vector(2, 5, 2)), radius: 3 }, test.getDimension().type),
    )

    region.saveStructure() // save empty structure with air
    await region.area.forEachVector((vector, isIn, dimension) => {
      dimension.setBlockType(vector, isIn ? MinecraftBlockTypes.Bedrock : MinecraftBlockTypes.Glass)
    })

    await test.idle(40)
    await region.loadStructure()

    await region.area.forEachVector((vector, isIn) => {
      test.assertBlockPresent(isIn ? MinecraftBlockTypes.Air : MinecraftBlockTypes.Glass, test.worldLocation(vector))
    })

    test.succeed()
  })
    .structureName(TestStructures.flat)
    .maxTicks(400)
})