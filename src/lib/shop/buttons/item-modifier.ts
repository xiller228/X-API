import { ContainerSlot, ItemStack, Player } from '@minecraft/server'
import { BUTTON, ChestForm, getAuxOrTexture, itemLocaleName, translateEnchantment } from 'lib'
import { MaybeRawText, t } from 'lib/text'
import { Cost, MultiCost, ShouldHaveItemCost } from '../cost'
import { ShopForm, ShopFormSection, ShopProduct } from '../form'
import { Shop } from '../shop'

type ItemFilter = (itemStack: ItemStack) => boolean
type OnSelect = (itemSlot: ContainerSlot, itemStack: ItemStack) => void

export function createItemModifier(
  shopForm: ShopForm,
  name: ShopProduct['name'],
  cost: Cost,
  itemFilter: ItemFilter,
  modifyItem: OnSelect,
) {
  shopForm.product(
    name,
    new MultiCost(ShouldHaveItemCost.createFromFilter(itemFilter, 'Выберите '), cost),
    (player, text, success) => {
      selectItem(
        itemFilter,
        player,
        text,

        // OnSelect
        (slot, item) => {
          cost.buy(player)
          modifyItem(slot, item)
          success()
        },

        // Back
        () => shopForm.show(player, undefined, undefined),
      )
      return false
    },
  )
}

export type ShopMenuWithSlotCreate = (
  form: ShopFormSection,
  slot: ContainerSlot,
  itemStack: ItemStack,
  player: Player,
) => void

export function createItemModifierSection(
  shopForm: ShopForm,
  shop: Shop,

  name: MaybeRawText,
  itemFilterName: MaybeRawText,
  itemFilter: ItemFilter,
  onOpen: ShopMenuWithSlotCreate,
) {
  shopForm.product(name, ShouldHaveItemCost.createFromFilter(itemFilter, itemFilterName), (player, text) => {
    const back = () => shopForm.show(player, undefined, undefined)

    const select = () =>
      selectItem(
        itemFilter,
        player,
        text,

        // OnSelect
        (slot, item) => {
          ShopForm.showSection(
            name,
            ShopForm.toShopFormSection(shopForm),
            shop,
            player,

            // Back
            back,

            (form, player) => {
              form.body = () =>
                t.raw`Зачарования:\n${{
                  rawtext: item.enchantable?.getEnchantments().map(translateEnchantment).flat(),
                }}`
              form.button(
                t.raw`Выбранный предмет: ${{ translate: itemLocaleName(item) }}\n§7Нажмите, чтобы сменить`,
                getAuxOrTexture(item.typeId, !!item.enchantable?.getEnchantments().length),
                select,
              )
              onOpen(form, slot, item, player)
            },
          )
        },

        // Back
        back,
      )

    select()
    return false
  })
}

function selectItem(itemFilter: ItemFilter, player: Player, text: MaybeRawText, select: OnSelect, back?: VoidFunction) {
  const { container } = player
  if (!container) return
  const chestForm = new ChestForm('45').title(text).pattern([0, 0], ['<-------?'], {
    '<': {
      icon: BUTTON['<'],
      callback: back,
    },
    '-': {
      icon: 'textures/blocks/glass',
    },
    '?': {
      icon: BUTTON['?'],
    },
  })
  for (const [i, item] of container.entries().filter(([, item]) => item && itemFilter(item))) {
    if (!item) continue
    chestForm.button({
      slot: i + 9,
      icon: item.typeId,
      nameTag: '%' + itemLocaleName(item.typeId),
      amount: item.amount,
      lore: item.getLore(),
      callback: () => select(container.getSlot(i), item),
    })
  }

  chestForm.show(player)
}