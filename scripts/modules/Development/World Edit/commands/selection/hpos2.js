import { WorldEditBuild } from "../../builders/WorldEditBuilder.js";

new XCommand({
	type: "wb",
	name: "hpos2",
	description: "Set position 2 to targeted block",
	role: "moderator",
}).executes((ctx) => {
	const pos = ctx.sender.getBlockFromViewDirection().location;
	if (!pos) return ctx.reply("Неа!");

	WorldEditBuild.pos2 = pos;
	ctx.reply(`§dПозиция§r 2 теперь ${pos.x}, ${pos.y}, ${pos.z}`);
});