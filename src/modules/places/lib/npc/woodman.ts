import { MinecraftItemTypes as i } from '@minecraft/vanilla-data'
import { Group } from 'lib/rpg/place'
import { ShopNpc } from 'lib/shop/npc'

export class Woodman extends ShopNpc {
  constructor(group: Group) {
    super(group.point('woodman').name('Дровосек'))
    this.shop.body(() => 'Я рублю топором только дерево, не пытайтесь заказать у меня убийство.\n\n')

    this.shop.menu(form => {
      for (const [name, typeId] of Object.entries(i)) {
        if (name.startsWith('Warped') || name.startsWith('Crimson') || name === 'Planks' || name === 'Wood') continue

        if (name.endsWith('Planks')) {
          form.sellableItem(typeId).defaultCount(1000).maxCount(10_000).basePrice(5)
        } else if (name.endsWith('Wood') && !/stripped/i.test(name)) {
          form.sellableItem(typeId).defaultCount(1000).maxCount(10_000).basePrice(5)
        }
      }
    })
  }
}