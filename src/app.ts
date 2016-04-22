import { loadAndAnalyze } from "analyze";
import { catalog } from "catalog";
import TextIndex from "textindex";

var plasticSurge = new TextIndex();

var grid = document.querySelector(".entries");
var entryTemplate = <HTMLTemplateElement>document.querySelector("#entry");

var entryData: catalog.Entry[] = null;
var entryElems: HTMLDivElement[] = [];

var featLabel: { [f: number]: string } = {};
featLabel[catalog.EntryFeatures.Win] = "Win";
featLabel[catalog.EntryFeatures.Mac] = "Mac";
featLabel[catalog.EntryFeatures.Linux] = "Linux";
featLabel[catalog.EntryFeatures.HTML5] = "HTML5";
featLabel[catalog.EntryFeatures.WebGL] = "WebGL";
featLabel[catalog.EntryFeatures.Unity] = "Unity";
featLabel[catalog.EntryFeatures.Java] = "Java";
featLabel[catalog.EntryFeatures.Love] = "Löve";
featLabel[catalog.EntryFeatures.Flash] = "Flash";
featLabel[catalog.EntryFeatures.VR] = "VR";
featLabel[catalog.EntryFeatures.Mobile] = "Mobile";
featLabel[catalog.EntryFeatures.Source] = "Source";

var filterSets = new Map<catalog.EntryFeatures, Set<number>>();
filterSets.set(catalog.EntryFeatures.Win, new Set<number>());
filterSets.set(catalog.EntryFeatures.Mac, new Set<number>());
filterSets.set(catalog.EntryFeatures.Linux, new Set<number>());
filterSets.set(catalog.EntryFeatures.HTML5, new Set<number>());
filterSets.set(catalog.EntryFeatures.WebGL, new Set<number>());
filterSets.set(catalog.EntryFeatures.Unity, new Set<number>());
filterSets.set(catalog.EntryFeatures.Java, new Set<number>());
filterSets.set(catalog.EntryFeatures.Love, new Set<number>());
filterSets.set(catalog.EntryFeatures.Flash, new Set<number>());
filterSets.set(catalog.EntryFeatures.VR, new Set<number>());
filterSets.set(catalog.EntryFeatures.Mobile, new Set<number>());
filterSets.set(catalog.EntryFeatures.Source, new Set<number>());


var allSet = new Set<number>();
var activeSet = new Set<number>();
var activeFilter: catalog.EntryFeatures = 0;
var activeCategory = "";
var activeQuery = "";


function updateActiveSet() {
	var count = entryElems.length;

	var searchSet: Set<number> = null;
	if (activeQuery.length > 0) {
		searchSet = plasticSurge.query(activeQuery);
	}

	for (var ix = 0; ix < count; ++ix) {
		var entry = entryData[ix];
		var hasNow = activeSet.has(ix);

		var shouldHave = (entry.features & activeFilter) == activeFilter;
		if (activeCategory.length > 0) {
			shouldHave = shouldHave && (entry.category == activeCategory);
		}
		if (searchSet) {
			shouldHave = shouldHave && (searchSet.has(ix));
		}

		if (hasNow !== shouldHave) {
			if (shouldHave) {
				activeSet.add(ix);
				entryElems[ix].style.display = "";
			}
			else {
				activeSet.delete(ix);
				entryElems[ix].style.display = "none";
			}
		}
	}
}


function makeEntryTile(entry: catalog.Entry, entryIndex: number) {
	var elem = <HTMLDivElement>(<Element>entryTemplate.content.cloneNode(true)).firstElementChild;
	(<HTMLImageElement>elem.querySelector("img")).src = entry.thumbnail_url;
	elem.querySelector("h2").textContent = entry.title;
	elem.querySelector("p.author span").textContent = entry.author.name;
	elem.dataset["eix"] = ""+entryIndex;
	var pills = elem.querySelector(".pills");

	var featMask = 1;
	while (featMask <= catalog.EntryFeatures.Source) {
		if (entry.features & featMask) {
			var pill = document.createElement("span");
			pill.className = "pill";
			pill.textContent = featLabel[featMask];
			pills.appendChild(pill);

			filterSets.get(featMask).add(entryIndex);
		}
		featMask <<= 1;
	}

	return elem;
}


loadAndAnalyze().then(data => {
	entryData = data;
	var count = entryData.length;

	var t0 = performance.now();
	for (var x = 0; x < count; ++x) {
		var entry = entryData[x];
		entryElems[x] = makeEntryTile(entry, x);
		grid.appendChild(entryElems[x]);

		allSet.add(x);
		activeSet.add(x);
	}
	var t1 = performance.now();

	// index all text
	for (var x = 0; x < count; ++x) {
		var entry = entryData[x];
		plasticSurge.indexRawString(entry.title, x);
		plasticSurge.indexRawString(entry.author.name, x);
		plasticSurge.indexRawString(entry.description, x);
	}

	var t2 = performance.now();

	console.info("Elems / Index", (t1 - t0).toFixed(1), (t2 - t1).toFixed(1));
	(<any>window).ps = plasticSurge;

	// click to go to LD
	grid.addEventListener("click", (evt: MouseEvent) => {
		var tgt = <HTMLElement>evt.target;
		while (tgt && (tgt.dataset["eix"] == null)) {
			tgt = tgt.parentElement;
		}
		if (tgt && tgt.dataset["eix"] != null) {
			var eix = parseInt(tgt.dataset["eix"]);
			var ldURL = entryData[eix].entry_url;
			window.open(ldURL, "_blank");
		}
	});

	// full text search
	var searchControl = <HTMLInputElement>(document.querySelector("#terms"));
	searchControl.oninput = (evt: Event) => {
		activeQuery = searchControl.value;
		updateActiveSet();
	};

	// category radios
	var categoryControls = <HTMLInputElement[]>([].slice.call(document.querySelectorAll("input[name=category]"), 0));
	for (let cc of categoryControls) {
		cc.onchange = (evt: Event) => {
			var ctrl = <HTMLInputElement>evt.target;
			var val = ctrl.value;

			if (ctrl.checked) {
				if (activeCategory !== val) {
					activeCategory = val;
					updateActiveSet();
				}
			}
		};
	}

	// filter checkboxes
	var filterControls = <HTMLInputElement[]>([].slice.call(document.querySelectorAll("input[name=feature]"), 0));
	for (let fc of filterControls) {
		fc.onchange = (evt: Event) => {
			var ctrl = <HTMLInputElement>evt.target;
			var val = parseInt(ctrl.value);

			if (ctrl.checked) {
				activeFilter |= val;
			}
			else {
				activeFilter &= ~val;
			}
			updateActiveSet();
		};
	}
});
