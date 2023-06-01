import {
	EquipmentSlot,
	ItemLockMode,
	ItemStack,
	MinecraftEffectTypes,
	MinecraftItemTypes,
	Player,
	Vector,
	system,
	world,
} from "@minecraft/server";
import { Database } from "xapi.js";

const RTP_ELYTRA = new ItemStack(MinecraftItemTypes.elytra, 1);
const lore = ["§r§7Элитра перелета, пропадает на земле"];
RTP_ELYTRA.setLore(lore);
RTP_ELYTRA.nameTag = "§6Элитра перемещения";
RTP_ELYTRA.lockMode = ItemLockMode.slot;
/** @type {Database<string, {elytra?: 1}>} */
const DB = XA.tables.player;

/**
 * Teleports a player randomly within a specified range
 * @param {Player} target - The player to teleport randomly
 * @param {Vector3} from - The starting position of the random teleportation
 * @param {Vector3} to - The ending position of the random teleportation
 * @param {object} options - An object containing optional parameters
 * @param {number} [options.y=200] - The height at which to teleport the player
 * @param {number} [options.fromYtoBlock=60] - The minimum distance between the player and the ground for the teleportation to be valid
 * @param {Dimensions} [options.dimension='overworld'] - The dimension in which to teleport the player
 * @param {boolean} [options.elytra=true] - Whether or not to give the player an elytra after teleportation
 * @param {number} [options.c=0] - A counter to prevent infinite recursion in case of invalid teleportation
 * @param {number} [options.keepInSkyTime=5] - The amount of time (in seconds) to keep the player in the air after teleportation
 * @returns {Vector3}
 */
export function randomTeleport(
	target,
	from,
	to,
	{
		y = 200,
		dimension = "overworld",
		fromYtoBlock = 60,
		elytra = true,
		c = 0,
		keepInSkyTime = 5,
	}
) {
	const x = ~~Math.randomInt(from.x, to.x);
	const z = ~~Math.randomInt(from.z, to.z);

	const d = world[dimension];
	const block = d.getBlockFromRay({ x, y: y - 2, z }, Vector.down);
	if (block) {
		if ((y - block.y < fromYtoBlock || block.isLiquid()) && c < 10) {
			c++;
			return randomTeleport(target, from, to, {
				y,
				dimension,
				fromYtoBlock,
				elytra,
				c,
				keepInSkyTime,
			});
		}
	}

	target.teleport(
		{ x, y, z },
		{
			facingLocation: { x, y: y - 10, z },
			keepVelocity: false,
		}
	);

	if (elytra) giveElytra(target);
	else {
		target.addEffect(
			MinecraftEffectTypes.slowFalling,
			((y - 60) / 2 + keepInSkyTime) * 20,
			{
				amplifier: 1,
				showParticles: false,
			}
		);
	}

	if (keepInSkyTime) {
		keepInSkyTime *= 20;
		const interval = system.runInterval(
			() => {
				if (keepInSkyTime) {
					keepInSkyTime--;
					target.teleport({ x, y, z }, { keepVelocity: false });
				} else system.clearRun(interval);
			},
			"randomTeleport::keepInSky",
			0
		);
	}

	return { x, y, z };
}

/**
 *
 * @param {Player} player
 */
function giveElytra(player) {
	const slot = player
		.getComponent("equipment_inventory")
		.getEquipmentSlot(EquipmentSlot.chest);

	// Item in slot
	if (slot.getItem()) {
		const { container } = player.getComponent("inventory");
		if (container.emptySlotsCount) {
			container.addItem(slot.getItem());
		} else {
			player.tell("§cСними нагрудник или свою элитру!");
		}
	}

	slot.setItem(RTP_ELYTRA);
	const { data, save } = DB.work(player.id);
	data.elytra = 1;
	save();
}

system.runInterval(
	() => {
		const elytred = DB.entries()
			.filter(([key, data]) => data.elytra)
			.map(([key, data]) => key);

		const players = world
			.getPlayers()
			.filter((e) => elytred.includes(e.id))
			.filter((e) => {
				const block = e.dimension.getBlock(Vector.add(e.location, Vector.down));
				if (!block) return;
				if (block.isAir()) return;
				return true;
			});

		for (const player of players) clearElytra(player);
	},
	"clear rtp elytra",
	20
);

/**
 *
 * @param {Player} player
 */
function clearElytra(player) {
	const slot = player
		.getComponent("equipment_inventory")
		.getEquipmentSlot(EquipmentSlot.chest);
	if (slot.nameTag === RTP_ELYTRA.nameTag) slot.setItem(undefined);
	const { data, save } = DB.work(player.id);
	delete data.elytra;
	save();
}