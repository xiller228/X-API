import { Player } from '@minecraft/server'
import { ActionForm, ArrayForm, Mail, Menu, Settings } from 'lib'
import { Join } from 'lib/PlayerJoin'
import { Rewards } from 'lib/Rewards'

new Command('mail').setDescription('Посмотреть входящие сообщения почты').executes(ctx => mailMenu(ctx.player))

const getSettings = Settings.player(...Menu.settings, {
  mailReadOnOpen: {
    name: 'Читать письмо при открытии',
    description: 'Помечать ли письмо прочитанным при открытии',
    value: true,
  },
  mailClaimOnDelete: {
    name: 'Собирать награды при удалении',
    description: 'Собирать ли награды при удалении письма',
    value: true,
  },
})

const getJoinSettings = Settings.player(...Join.settingsName, {
  unreadMails: {
    name: 'Почта',
    description: 'Показывать ли при входе сообщение с кол-вом непрочитанных',
    value: true,
  },
})

export function mailMenu(player: Player, back?: VoidFunction) {
  new ArrayForm(`Почта${Mail.unreadBadge(player.id)}`, 'Входящие', Mail.getLetters(player.id), {
    filters: {
      unread: {
        name: 'Непрочитанные',
        description: 'Показывать только непрочитанные сообщения',
        value: false,
      },
      unclaimed: {
        name: 'Несобранные награды',
        description: 'У письма есть несобранные награды',
        value: false,
      },
      sort: {
        name: 'Соритровать по',
        value: [
          ['date', 'Дате'],
          ['name', 'Имени'],
        ],
      },
    },
    button({ letter, index }) {
      const name = `${letter.read ? '§7' : '§f'}${letter.title}${letter.read ? '\n§8' : '§c*\n§7'}${letter.content}`
      return [
        name,
        null,
        () => {
          letterDetails({ letter, index }, player)
          if (getSettings(player).mailReadOnOpen) Mail.readMessage(player.id, index)
        },
      ]
    },

    sort(keys, filters) {
      if (filters.unread) keys = keys.filter(letter => !letter.letter.read)

      if (filters.unclaimed) keys = keys.filter(letter => !letter.letter.rewardsClaimed)

      filters.sort === 'name'
        ? keys.sort((letterA, letterB) => letterA.letter.title.localeCompare(letterB.letter.title))
        : keys.reverse()

      return keys
    },
    back,
  }).show(player)
}

function letterDetails(
  { letter, index }: ReturnType<(typeof Mail)['getLetters']>[number],
  player: Player,
  back = () => mailMenu(player),
  message = '',
) {
  const form = new ActionForm(
    letter.title,
    message + letter.content + '\n\n§l§fНаграды:§r\n' + Rewards.restore(letter.rewards).toString(),
  ).addButtonBack(back)

  if (!letter.rewardsClaimed && letter.rewards?.length)
    form.addButton('Забрать награду', () => {
      Mail.claimRewards(player, index)

      const message = `§aНаграда успешно забрана!`
      player.success(message)

      letterDetails({ letter, index }, player, back, message + '\n\n§r§f')
    })

  if (!letter.read)
    form.addButton('Пометить как прочитанное', () => {
      Mail.readMessage(player.id, index)
      back()
    })

  let deleteDesc = '§cВы уверены, что хотите удалить письмо?'
  if (!letter.rewardsClaimed) {
    if (getSettings(player).mailClaimOnDelete) {
      deleteDesc += ' Все награды будут собраны автоматически'
    } else {
      deleteDesc += ' Вы потеряете все награды, прикрепленные к письму!'
    }
  }

  form.addButtonPrompt('§cУдалить письмо', deleteDesc, () => {
    if (getSettings(player).mailClaimOnDelete) Mail.claimRewards(player, index)
    Mail.deleteMessage(player, index)
    back()
  })

  form.show(player)
}

Join.onMoveAfterJoin.subscribe(({ player }) => {
  if (!getJoinSettings(player).unreadMails) return
  const unreadCount = Mail.getUnreadMessagesCount(player.id)
  if (unreadCount === 0) return
  player.info(`§fПочта: §eУ вас §f${unreadCount} §eнепрочитанных сообщений! Посмотреть: §f.mail`)
})