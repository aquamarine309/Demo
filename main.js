/* Format */
const notation = new ADNotations.ScientificNotation();

Decimal.prototype.valueOf = () => {
  throw new Error(`Implicit conversion from Decimal to number`);
};

Decimal.prototype.copy = function copy() {
  return Decimal.fromDecimal(this);
}

const commaRegexp = /\B(?=(\d{3})+(?!\d))/gu;
function formatWithCommas(value) {
  const decimalPointSplit = value.toString().split(".");
  decimalPointSplit[0] = decimalPointSplit[0].replace(commaRegexp, ",");
  return decimalPointSplit.join(".");
};

function format(value, places, placesUnder1000) {
  return notation.format(value, places, placesUnder1000, 3);
}

function formatInt(value) {
  if (typeof value === "number" && value <= 1e9) {
    return formatWithCommas(value.toFixed(0));
  }
  return format(value);
}

function formatX(value, places, placesUnder1000) {
  return `×${format(value, places, placesUnder1000)}`;
};

function formatPow(value, places, placesUnder1000) {
  return `^${format(value, places, placesUnder1000)}`;
};

const DC = {
  D0: new Decimal("0"),
  D1: new Decimal("1"),
  D2: new Decimal("2"),
  D3: new Decimal("3"),
  D5: new Decimal("5"),
  D6: new Decimal("6"),
  D25: new Decimal("25"),
  D50: new Decimal("50"),
  E1: new Decimal("1e1"),
  E2: new Decimal("1e2"),
  E3: new Decimal("1e3")
}


const GAME_SPEED = 1;

let player = {
  points: DC.D1,
  generator: DC.D0,
  boost: DC.D0,
  energy: DC.D0,
  galaxies: DC.D0,
  records: {
    maxPoints: DC.D1
  },
  lastUpdate: Date.now(),
  options: {
    updateRate: 33
  }
}


function deepcopy(obj) {
  const newObj = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    if (value instanceof Decimal) {
      newObj[key] = value.copy();
    } else if (typeof value === "object") {
      newObj[key] = deepcopy(value);
    } else {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

const DEFAULT = deepcopy(player);

function mergeObj(target, current) {
  const newObj = Array.isArray(target) ? [] : {};
  for (const key in target) {
    const value = target[key];
    const value2 = current[key];
    if (value2 === undefined) {
      if (value instanceof Decimal) {
        newObj[key] = value.copy();
      } else if (typeof value === "object") {
       newObj[key] = deepcopy(value);
      } else {
        newObj[key] = obj[key];
      }
    } else {
      if (value instanceof Decimal) {
        newObj[key] = new Decimal(value2);
      } else if (typeof value === "object") {
        newObj[key] = deepcopy(value, value2);
      } else {
        newObj[key] = value2;
      }
    }
  }
  return newObj;
}

const save = localStorage.getItem("game");

if (save !== null) {
  player = mergeObj(DEFAULT, JSON.parse(save));
}

String.format = function format(string, ...args) {
  return string.replace(/%(\d)\$s/g, function(_, index) {
    return args[parseInt(index) - 1];
  });
}

const strings = {
  you_have_X_points: "你拥有 %1$s 个点。",
  generator_description: "生成点数",
  generator_effect: "+%1$s/秒",
  boost_description: "增幅生成速度",
  cost_X_points: "价格: %1$s 点数",
  first_reset_text: "重置点数、生成器和速度增幅, 但获得 %1$s 能量",
  first_reset_text_b: "重置点数、生成器和速度增幅，下个能量需要 %1$s 个点数",
  first_reset_text_c: "达到 %1$s 点数以重置",
  you_have_X_energy: "你拥有 %1$s 能量。",
  currently_X: "当前: %1$s",
  boost_description_b: "购买 %1$s 个生成器以解锁速度增幅",
  requirement_X_energy: "需要: %1$s 能量",
  milestone_0: "每拥有 %1$s 倍的点数，生成速度 %2$s",
  milestone_1: "速度增幅的效果大幅增强",
  milestone_2: "能量加成生成速度",
  milestone_3: "解锁星系",
  galaxy_description: "由于星系的影响，时间流速会异常增高",
  you_have_X_galaxies: "你拥有 %1$s 个星系",
  amount_X: "数量: %1$s",
  mult_X: "加成: %1$s",
  cost_X_energy: "价格: %1$s 能量",
  buy_galaxy: "购买星系",
  buy_galaxy_b: "自动进行重置",
  buy_max: "购买最大数量"
}

const uiViews = ["gameView", "headerResourceView", "pointTextView", "generatorButton", "boostButton", "firstResetButton", "energyTextView", "milestoneViews", "milestoneView0", "milestoneView1", "milestoneView2", "milestoneView3", "galaxyInfoView", "galaxyRow", "galaxyAmountView", "galaxyMultView", "buyGalaxyButton", "buyMaxGalaxyButton"];

for (const id of uiViews) {
  const el = document.getElementById(id);
  if (el === null) {
    throw new Error("Unexpected Element: :#" + id);
  }
}

class Effect {
  get effect() {
    throw new Error("Effect is undefined");
  }
  
  get canBeApplied() {
    return true;
  }
}

class UpgradeState extends Effect {
  get isBought() {
    /* abstract */
  }
  
  set isBought(value) {
    /* abstract */
  }
  
  get canBeApplied() {
    return this.isBought;
  }
  
  purchase() {
    /* abstract */
  }
}

class Rebuyable extends Effect {
  get boughtAmount() {
    /* abstract */
  }
  
  set boughtAmount(value) {
    /* abstract */
  }
  
  get canBeApplied() {
    return this.boughtAmount.gt(0);
  }
  
  purchase() {
    /* abstract */
  }
  
  get isAffordable() {
    /* abstract */
  }
  
  get cost() {};
}

class PointUpgradeState extends Rebuyable {
  get isUnlocked() {
    return true;
  }
  
  get baseCost() {
    return null;
  }
  
  get costMult() {
    return null;
  }
  
  get cost() {
    return this.baseCost.times(this.costMult.pow(this.boughtAmount));
  }
  
  get isAffordable() {
    return this.isUnlocked && player.points.gte(this.cost);
  }
  
  purchase() {
    if (!this.isAffordable) return;
    player.points = player.points.sub(this.cost);
    this.boughtAmount = this.boughtAmount.add(1);
  }
}

const PointUpgrades = {
  generator: new class extends PointUpgradeState {
    
    get boughtAmount() {
      return player.generator;
    }
    
   set boughtAmount(value) {
      player.generator = value;
    }
    
    get baseCost() {
      return DC.D1;
    }
    
    get costMult() {
      return DC.D5;
    }
    
    get effect() {
      let mult = this.boughtAmount.pow(2);
      if (PointUpgrades.boost.canBeApplied) {
        mult = mult.times(PointUpgrades.boost.effect);
      }
      if (Milestones.multPerPoint.canBeApplied) {
        mult = mult.times(Milestones.multPerPoint.effect);
      }
      if (Milestones.energyBoost.canBeApplied) {
        mult = mult.times(Milestones.energyBoost.effect);
      }
      return mult;
    }
  },
  boost: new class extends PointUpgradeState {
    
    get boughtAmount() {
      return player.boost;
    }
    
   set boughtAmount(value) {
      player.boost = value;
    }
    
    get isUnlocked() {
      return player.generator.gte(3);
    }
    
    get baseCost() {
      return DC.E2;
    }
    
    get costMult() {
      return DC.E1;
    }
    
    get effect() {
      let mult = this.boughtAmount.add(1);
      if (Milestones.boostAddSelf.canBeApplied) {
        mult = mult.times(Milestones.boostAddSelf.effect);
      }
      if (Galaxy.isUnlocked) {
        mult = mult.times(Galaxy.effect);
      }
      return mult;
    }
  }
}

const FirstReset = {
  gainedEnergy() {
    return player.records.maxPoints.log10().div(3).pow(1.5).floor();
  },
  
  energyToPoints(energy) {
    return energy.root(1.5).times(3).pow10();
  },
  
  get requirement() {
    return DC.E3;
  },
  
  get canReset() {
    return player.records.maxPoints.gte(FirstReset.requirement);
  },
  
  reset() {
    if (!FirstReset.canReset) return;
    player.energy = player.energy.max(FirstReset.gainedEnergy());
    player.points = DC.D1;
    player.generator = DC.D0;
    player.boost = DC.D0;
    player.records.maxPoints = DC.D1;
  }
}

generatorButton.addEventListener("click", function() {
  PointUpgrades.generator.purchase();
});

boostButton.addEventListener("click", function() {
  PointUpgrades.boost.purchase();
});

firstResetButton.addEventListener("click", function() {
  FirstReset.reset();
});

buyGalaxyButton.addEventListener("click", function() {
  Galaxy.purchase();
});

buyMaxGalaxyButton.addEventListener("click", function() {
  Galaxy.max();
});

class Milestone extends Effect {
  get requirement() {/* abstract */}
  get canBeApplied() { return player.energy.gte(this.requirement); }
}

const Milestones = {
  multPerPoint: new class extends Milestone {
    get requirement() { return DC.D1; }
    get effect() {
      return DC.D2.pow(player.points.add(1).log(20).floor());
    }
  },
  boostAddSelf: new class extends Milestone {
    get requirement() { return DC.D2; }
    get effect() {
      return PointUpgrades.boost.boughtAmount.pow(2).div(2).add(1);
    }
  },
  energyBoost: new class extends Milestone {
    get requirement() { return DC.D3; }
    get effect() {
      return DC.D5.pow(player.energy.sqrt());
    }
  },
  unlockGalaxy: new class extends Milestone {
    get requirement() { return DC.D6; }
  }
}

const Galaxy = {
  get isUnlocked() {
    return Milestones.unlockGalaxy.canBeApplied || player.galaxies.gt(0);
  },
  
  get effect() {
    return DC.D2.pow(DC.E1.pow(player.galaxies).minus(1));
  },
  
  get cost() {
    return DC.D2.times(DC.D3.pow(player.galaxies));
  },
  
  get isAffordable() {
    return player.energy.gte(this.cost);
  },
  
  purchase() {
    if (!Galaxy.isAffordable) return;
    FirstReset.reset();
    player.energy = player.energy.minus(this.cost);
    player.galaxies = player.galaxies.add(1);
  },
  
  max() {
    if (!Galaxy.isAffordable) return;
    FirstReset.reset();
    if (player.energy.lt(1e3)) {
      while (Galaxy.isAffordable) {
        Galaxy.purchase();
      }
      return;
    }
    const bought = player.energy.div(2).log(3).floor().add(1);
    if (bought.lte(player.galaxies)) return;
    player.galaxies = bought;
  }
}

galaxyInfoView.innerText = strings.galaxy_description;
buyMaxGalaxyButton.innerText = strings.buy_max;

const gameInterval = setInterval(function() {
  let diff = Date.now() - player.lastUpdate;
  player.lastUpdate += diff;
  
  diff *= GAME_SPEED;
  
  const gainedPointsPerSecond = PointUpgrades.generator.effect;
  if (PointUpgrades.generator.canBeApplied) {
    player.points = player.points.add(gainedPointsPerSecond.times(diff / 1000));
    player.records.maxPoints = player.records.maxPoints.max(player.points);
  }
  
  pointTextView.innerText = String.format(strings.you_have_X_points, format(player.points, 2, 1));
  
  const energy = player.energy;
  const firstReseted = energy.gt(0);
  
  if (firstReseted) {
    energyTextView.innerText = String.format(
      strings.you_have_X_energy,
      format(energy, 2)
    );
    energyTextView.style.visibility = "visible";
  } else {
    energyTextView.style.visibility = "hidden";
  }
  
  if (PointUpgrades.generator.isUnlocked) {
    generatorButton.style.visibility = "visible";
    generatorButton.innerText = (
     strings.generator_description + "\n" +
      String.format(
        strings.currently_X,
        String.format(
          strings.generator_effect,
         format(gainedPointsPerSecond, 2)
      )) + "\n" +
      String.format(
        strings.cost_X_points,
        format(PointUpgrades.generator.cost, 2)
      )
    );
    if (PointUpgrades.generator.isAffordable) {
      generatorButton.classList.remove("btn-disabled");
    } else {
      generatorButton.classList.add("btn-disabled");
    }
  } else {
    generatorButton.style.visibility = "hidden";
  }
  
  if (PointUpgrades.boost.isUnlocked || firstReseted) {
    boostButton.style.visibility = "visible";
    const boostMultiplier = PointUpgrades.boost.effect;
    boostButton.innerText = (
      PointUpgrades.boost.isUnlocked ? (strings.boost_description + "\n" +
      String.format(
        strings.currently_X,
        formatX(boostMultiplier, 2, 1)
      ) + "\n" +
      String.format(
        strings.cost_X_points,
        format(PointUpgrades.boost.cost, 2)
      )) : (
        String.format(
          strings.boost_description_b,
          formatInt(3)
        )
      )
    );
    if (PointUpgrades.boost.isAffordable) {
      boostButton.classList.remove("btn-disabled");
    } else {
      boostButton.classList.add("btn-disabled");
    }
  } else {
    boostButton.style.visibility = "hidden";
  }
  
  const canReset1 = FirstReset.canReset;
  
  if (canReset1) {
    const gainedEnergy = FirstReset.gainedEnergy().minus(player.energy);
    firstResetButton.innerText = (
      gainedEnergy.gt(0) ?
      String.format(
        strings.first_reset_text,
        format(gainedEnergy, 2)
      ) :
      String.format(
        strings.first_reset_text_b,
        format(FirstReset.energyToPoints(energy.add(1)), 2)
      )
    );
    firstResetButton.classList.remove("btn-disabled");
  } else {
    firstResetButton.innerText = String.format(
      strings.first_reset_text_c,
      format(FirstReset.requirement, 2)
    );
    firstResetButton.classList.add("btn-disabled");
  }
  
  if (firstReseted) {
    milestoneViews.style.visibility = "visible";
    
    const mile0 = Milestones.multPerPoint;
    if (mile0.canBeApplied) {
      milestoneView0.classList.remove("btn-disabled");
    } else {
      milestoneView0.classList.add("btn-disabled");
    }
    milestoneView0.innerText = (
      String.format(
        strings.milestone_0,
        formatX(20),
        formatX(2)
      ) + "\n" +
      String.format(
        strings.currently_X,
        formatX(mile0.effect, 2)
      ) + "\n" +
      String.format(
        strings.requirement_X_energy,
        formatInt(mile0.requirement)
      )
    );
    
    const mile1 = Milestones.boostAddSelf;
    if (mile1.canBeApplied) {
      milestoneView1.classList.remove("btn-disabled");
    } else {
      milestoneView1.classList.add("btn-disabled");
    }
    milestoneView1.innerText = (
      strings.milestone_1 + "\n" +
      String.format(
        strings.currently_X,
        formatX(mile1.effect, 2, 2)
      ) + "\n" +
      String.format(
        strings.requirement_X_energy,
        formatInt(mile1.requirement)
      )
    );
    
    const mile2 = Milestones.energyBoost;
    if (mile2.canBeApplied) {
      milestoneView2.classList.remove("btn-disabled");
    } else {
      milestoneView2.classList.add("btn-disabled");
    }
    milestoneView2.innerText = (
      strings.milestone_2 + "\n" +
      String.format(
        strings.currently_X,
        formatX(mile2.effect, 2, 2)
      ) + "\n" +
      String.format(
        strings.requirement_X_energy,
        formatInt(mile2.requirement)
      )
    );
    
    const mile3 = Milestones.unlockGalaxy;
    if (mile3.canBeApplied) {
      milestoneView3.classList.remove("btn-disabled");
    } else {
      milestoneView3.classList.add("btn-disabled");
    }
    milestoneView3.innerText = (
      strings.milestone_3 + "\n" +
      String.format(
        strings.requirement_X_energy,
        formatInt(mile3.requirement)
      )
    )
  } else {
    milestoneViews.style.visibility = "hidden";
  }
  
  if (Galaxy.isUnlocked) {
    galaxyInfoView.style.display = "inherit";
    galaxyRow.style.disaply = "inherit";
    galaxyAmountView.innerText = (
      String.format(
        strings.amount_X,
        format(player.galaxies, 2)
      )
    );
    galaxyMultView.innerText = (
      String.format(
        strings.mult_X,
        formatX(Galaxy.effect, 2)
      )
    );
    buyGalaxyButton.innerText = (
      strings.buy_galaxy + "\n" +
      (canReset1 ? strings.buy_galaxy_b + "\n": "") +
      String.format(
        strings.cost_X_energy,
        format(Galaxy.cost, 2)
      )
    );
    if (Galaxy.isAffordable) {
      buyGalaxyButton.classList.remove("btn-disabled");
      buyMaxGalaxyButton.classList.remove("btn-disabled");
    } else {
      buyGalaxyButton.classList.add("btn-disabled");
      buyMaxGalaxyButton.classList.add("btn-disabled");
    }
  } else {
    galaxyInfoView.style.display = "none";
    galaxyRow.style.display = "none";
  }
  
}, player.updateRate);

setInterval(() => localStorage.setItem("game", JSON.stringify(player)), 1e4);
