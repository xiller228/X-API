import {
	MinecraftBlockTypes,
	Player,
	system,
	Vector,
	world,
} from "@minecraft/server";
import { MessageForm } from "lib/Form/MessageForm.js";
import { util, Database } from "xapi.js";
import { CubeRegion, Region } from "../../Server/Region/Region.js";

const DB = new Database("buildRegion");

const squarePlace = -55;

/**
 *
 * @param {Player} player
 * @param {CubeRegion} region
 */
export function teleportToRegion(player, region) {
	player.teleport(
		{ x: region.from.x, y: squarePlace + 3, z: region.from.z },
		{ dimension: world.overworld }
	);
}

/**
 * @param {Player} player
 * @param {string} text
 * @param {string} yesText
 * @param {() => void} onYesAction
 * @param {string} noText
 * @param {() => void} onNoAction
 */
export function prompt(player, text, yesText, onYesAction, noText, onNoAction) {
	new MessageForm("Вы уверены?", text)
		.setButton1(yesText, onYesAction)
		.setButton2(noText, onNoAction)
		.show(player);
}

/**
 *
 * @param {string} spining
 * @param {number} percents
 */
function getProgressBar(spining, percents) {
	const pb = new Array(10).join(" ").split(" ");
	const e = pb.map((_, i) => (Math.floor(percents / 10) > i ? "§a▌" : "§7▌"));
	return `§d${spining[0]} ${e.join("")} §f${~~percents}%`;
}

/**
 *
 * @param {Player} player
 * @param {CubeRegion} Pregion
 * @returns
 */
export async function ClearRegion(player, Pregion) {
	let percents = 0;
	let spining = ["/", "-", "\\", "|"];
	let time = 0;
	const id = system.runInterval(
		() => {
			player.onScreenDisplay.setActionBar(getProgressBar(spining[0], percents));
			time++;
			if (time % 10 === 0) spining = spining.slice(1).concat(spining.shift());
		},
		"ResetSquare_ProgressActionbar",
		0
	);
	const loc1 = { x: Pregion.from.x, y: -63, z: Pregion.from.z };
	const loc2 = { x: Pregion.to.x, y: 100, z: Pregion.to.z };
	const blocks = Vector.size(loc1, loc2);

	let c = 0;
	const e = Vector.foreach(loc1, loc2);
	for (const loc of e) {
		c++;
		if (c % 500 === 0 || c === 0) await system.sleep(0);
		percents = c / ~~(blocks / 100);

		const block = world.overworld.getBlock(loc);
		if (block.typeId === MinecraftBlockTypes.air.id) continue;
		block.setType(MinecraftBlockTypes.air);
	}
	return () => system.clearRun(id);
}

/**
 *
 * @param {Player} player
 */
export async function CreateRegion(player, tp = true) {
	const place = await findFreePlace();

	const region = new CubeRegion(place.from, place.to, "overworld", {
		...Region.CONFIG.PERMISSIONS,
		owners: [player.id],
	});
	DB.set(player.id, region.key);
	fillRegion(region.from, region.to);
	if (tp) teleportToRegion(player, region);
	return region;
}

/**
 *
 * @param {IRegionCords} from
 * @param {IRegionCords} to
 */
export async function fillRegion(from, to) {
	const firstLoc = { x: from.x, y: squarePlace, z: from.z };
	const secondLoc = { x: to.x, y: squarePlace, z: to.z };
	const waiter = util.waitEach(10);
	for (const loc of Vector.foreach(
		Vector.add(firstLoc, Vector.up),
		Vector.add(secondLoc, Vector.up)
	)) {
		await waiter();
		world.overworld.getBlock(loc).setType(MinecraftBlockTypes.grass);
	}
	for (const loc of Vector.foreach(firstLoc, secondLoc)) {
		await waiter();
		world.overworld.getBlock(loc).setType(MinecraftBlockTypes.allow);
	}
}

const size = 30; // size
const size2 = size / 2 - 1;

/**
 * @param {IRegionCords} center
 * @param {number} x
 * @param {number} z
 * @returns {IRegionCords}
 */
function moveCenter(center, x, z) {
	return { x: center.x + x * size, z: center.z + z * size };
}

/**
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function moveEls(arr) {
	const lm = arr.shift();
	return undefined !== lm ? [...arr, lm] : arr;
}

/**
 * @returns {Promise<{from: IRegionCords, to: IRegionCords}>}
 */
export async function findFreePlace() {
	let center = { x: 0, z: 0 };
	let tries = 0;
	let from;
	let to;
	/** @type {string[]} */
	const visited = [];
	let x = [-1, 0, 1, 0];
	let z = [0, -1, 0, 1];

	while (!from) {
		tries++;
		if (tries >= 20) await system.sleep(1), (tries = 0);

		const alreadyExist = Region.blockLocationInRegion(
			{ x: center.x, y: 0, z: center.z },
			"overworld"
		);

		if (alreadyExist) {
			const nextCenter = moveCenter(center, x[1], z[1]);
			if (!visited.includes(nextCenter.x + " " + nextCenter.z)) {
				x = moveEls(x);
				z = moveEls(z);
			}

			center = moveCenter(center, x[0], z[0]);
			visited.push(center.x + " " + center.z);
		} else {
			from = { x: center.x - size2, z: center.z - size2 };
			to = { x: center.x + size2, z: center.z + size2 };
			break;
		}
	}

	return { from, to };
}