export function calc_Lv_from_EXP(totalExp: number) {
  let lvl = 1;
  let expLeft = totalExp;
  while (true) {
    const req = lvl * lvl * 100;
    if (expLeft >= req) {
      expLeft -= req;
      lvl++;
    } else {
      return { level: lvl, currentExp: expLeft, requiredExp: req };
    }
  }
}
