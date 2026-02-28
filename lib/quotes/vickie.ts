/**
 * Vickie's quotes — she loves Ant being busy in the tunnel
 * because it means peace and quiet in the house for her.
 */

// When there are no tasks at all
export const vickieNoTasks = [
  "No tasks? Go find some! I was just settling down with my book.",
  "Nothing to do? I'm sure the tunnel disagrees. Off you go.",
  "Empty task list? Hit that Suggest button — I've just made a cuppa.",
  "No jobs? That can't be right. Go have a look, take your time.",
  "Nothing on the list? The tunnel always needs something. Go on, shoo.",
  "All done already? Well, go do a lap of the tunnel. I'm watching my programme.",
  "No tasks? Lovely for you. Now go find some — I need five minutes' peace.",
  "I was enjoying the quiet! Go check the tunnel, there's bound to be something.",
];

// When there are overdue tasks
export const vickieOverdueTasks = [
  "Overdue tasks, Ant! You should be out there, not sat in here with me.",
  "Those overdue ones need doing. The tunnel's waiting — and so is my quiet time.",
  "Overdue! Go on then, off to the tunnel. I'll hold the fort indoors.",
  "You've got overdue tasks piling up. Perfect excuse to get out of my hair!",
  "Still got overdue jobs? Go sort them out — I was about to put the telly on.",
  "Overdue tasks, Ant. The tunnel needs you more than I do right now.",
];

// When tasks exist but none overdue — encouraging him out the door
export const vickieHasTasks = [
  "Jobs to do! Off to the tunnel with you — I'll enjoy the peace.",
  "You've got tasks waiting. Go on, get your boots on. I'll be fine here.",
  "Tasks on the list means you should be outside, not bothering me!",
  "Good, plenty to keep you busy out there. I'll have the house to myself.",
  "Look at all those jobs! Best get cracking — take a flask, no need to rush back.",
  "Tasks to do, Ant. The tunnel won't sort itself. Off you pop!",
];

// When a task is completed
export const vickieTaskDone = [
  "Done already? Well done. Now find another one — I was just getting comfy.",
  "Ticked one off! Lovely. Now go do the next, I'm reading my book.",
  "Good work! But don't come back in yet, there's more to do.",
  "That's one down. Keep going — the house is so peaceful without you!",
];

// ── Harold quotes (the excitable spaniel who's always hungry) ──

// When harvests are ready now
export const haroldHarvestReady = [
  "Harold's hungry! Go pick those",
  "Harold's been drooling over those",
  "Harold says get out there and harvest those",
  "Harold's done waiting — go grab those",
  "Harold's practically eating them already. Harvest those",
  "Harold's been sat by those",
];

// When harvests are coming soon (not ready yet)
export const haroldHarvestSoon = [
  "Harold can't wait...",
  "Harold's counting the days...",
  "Harold's getting impatient...",
  "Harold keeps checking on the tunnel...",
  "Harold's already licking his lips...",
  "Harold's doing his rounds...",
];

// No harvests at all
export const haroldNoHarvests = [
  "Plant something and I'll keep an eye on it!",
  "Harold's got nothing to guard. Plant something!",
  "Harold's bored. No harvests to watch over yet.",
  "Nothing growing? Harold's available for planting supervision.",
  "Harold's ready and waiting. Just need something in the ground!",
];

// ── Wally quotes (the chill spaniel who sits and watches) ──

// When there are lots of empty beds
export const wallyEmptyBeds = [
  "Wally's got plenty of space to stretch out. Too much space, if you ask him.",
  "Wally's sitting in your empty beds. They make good napping spots.",
  "All these empty beds... Wally's claimed them as his own.",
  "Wally thinks these empty beds need filling. Less room for him to nap, but still.",
  "Wally's keeping your empty beds warm. You're welcome.",
];

// When the tunnel is mostly full
export const wallyFullTunnel = [
  "Wally approves. Hardly any room for him to dig now.",
  "Wally's impressed — nowhere left for him to sit!",
  "Good work, Ant. Wally can barely find a spot to lie down.",
];

// History page — no harvests
export const wallyNoHarvests = [
  "Wally's been sat here waiting. Nothing to report yet.",
  "No harvests? Wally's not impressed. He was promised snacks.",
  "Wally's keeping watch but there's nothing to see here yet.",
  "Empty harvest log. Wally says plant something first, then we'll talk.",
];

// History page — has harvests
export const wallyHasHarvests = [
  "Wally's been keeping count. He doesn't miss a thing.",
  "Wally watched every single one of these get picked.",
  "Wally's harvest inspection report: all present and correct.",
];

// No rotation history
export const wallyNoRotation = [
  "Wally's confused. He keeps going round in circles too, but at least he has an excuse.",
  "No rotation history yet. Wally's been rotating between his two beds all year though.",
];

/**
 * Pick a random quote. Uses a seed stored per page load
 * so the quote stays stable during re-renders but changes on refresh.
 */
let _seed: number | null = null;
function getSeed(): number {
  if (_seed === null) _seed = Math.floor(Math.random() * 10000);
  return _seed;
}

export function pickQuote(quotes: string[], offset = 0): string {
  const index = (getSeed() + offset) % quotes.length;
  return quotes[index];
}
