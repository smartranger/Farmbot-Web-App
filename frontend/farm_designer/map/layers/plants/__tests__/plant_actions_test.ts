jest.mock("../../../../../api/crud", () => ({
  edit: jest.fn(),
  save: jest.fn(),
  initSave: jest.fn(),
}));

const mockSpreads: { [x: string]: number } = { mint: 100 };
jest.mock("../../../../../open_farm/cached_crop", () => ({
  cachedCrop: jest.fn(p => Promise.resolve({ spread: mockSpreads[p] })),
}));

jest.mock("../../../actions", () => ({
  movePoint: jest.fn(),
}));

let mockPath = "/app/designer/plants/crop_search/mint";
jest.mock("../../../../../history", () => ({
  getPathArray: () => mockPath.split("/"),
}));

import {
  newPlantKindAndBody, NewPlantKindAndBodyProps,
  maybeSavePlantLocation, MaybeSavePlantLocationProps,
  beginPlantDrag, BeginPlantDragProps,
  setActiveSpread, SetActiveSpreadProps,
  dragPlant, DragPlantProps,
  createPlant, CreatePlantProps,
  dropPlant, DropPlantProps, jogPoint, JogPointProps, SavePointProps, savePoint,
} from "../plant_actions";
import { fakePlant } from "../../../../../__test_support__/fake_state/resources";
import { edit, save, initSave } from "../../../../../api/crud";
import { cachedCrop } from "../../../../../open_farm/cached_crop";
import {
  fakeMapTransformProps,
} from "../../../../../__test_support__/map_transform_props";
import { movePoint } from "../../../actions";
import {
  fakeCropLiveSearchResult,
} from "../../../../../__test_support__/fake_crop_search_result";
import { error } from "../../../../../toast/toast";
import { BotOriginQuadrant } from "../../../../interfaces";

describe("newPlantKindAndBody()", () => {
  it("returns new PlantTemplate", () => {
    const p: NewPlantKindAndBodyProps = {
      x: 0,
      y: 0,
      slug: "mint",
      cropName: "Mint",
      openedSavedGarden: "SavedGarden.1.1"
    };
    const result = newPlantKindAndBody(p);
    expect(result).toEqual(expect.objectContaining({
      kind: "PlantTemplate"
    }));
  });
});

describe("createPlant()", () => {
  const fakeProps = (): CreatePlantProps => ({
    cropName: "Mint",
    slug: "mint",
    gardenCoords: { x: 10, y: 20 },
    gridSize: { x: 1000, y: 2000 },
    dispatch: jest.fn(),
    openedSavedGarden: undefined,
  });

  it("creates plant", () => {
    createPlant(fakeProps());
    expect(initSave).toHaveBeenCalledWith("Point",
      expect.objectContaining({ name: "Mint", x: 10, y: 20 }));
  });

  it("doesn't create plant outside planting area", () => {
    const p = fakeProps();
    p.gardenCoords = { x: -100, y: -100 };
    createPlant(p);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("Outside of planting area"));
    expect(initSave).not.toHaveBeenCalled();
  });

  it("doesn't create generic plant", () => {
    const p = fakeProps();
    p.slug = "slug";
    createPlant(p);
    expect(initSave).not.toHaveBeenCalled();
  });
});

describe("dropPlant()", () => {
  const fakeProps = (): DropPlantProps => ({
    gardenCoords: { x: 10, y: 20 },
    cropSearchResults: [fakeCropLiveSearchResult()],
    openedSavedGarden: undefined,
    gridSize: { x: 1000, y: 2000 },
    dispatch: jest.fn(),
  });

  it("drops plant", () => {
    dropPlant(fakeProps());
    expect(initSave).toHaveBeenCalledWith("Point",
      expect.objectContaining({ name: "Mint", x: 10, y: 20 }));
  });

  it("doesn't drop plant", () => {
    mockPath = "/app/designer/plants/crop_search/";
    dropPlant(fakeProps());
    expect(initSave).not.toHaveBeenCalled();
  });

  it("throws error", () => {
    mockPath = "/app/designer/plants/crop_search/mint";
    const p = fakeProps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.gardenCoords = undefined as any;
    expect(() => dropPlant(p))
      .toThrowError(/while trying to add a plant/);
  });
});

describe("dragPlant()", () => {
  beforeEach(function () {
    Object.defineProperty(document, "querySelector", {
      value: () => ({ scrollLeft: 1, scrollTop: 2 }),
      configurable: true
    });
    Object.defineProperty(window, "getComputedStyle", {
      value: () => ({ transform: "scale(1)" }), configurable: true
    });
  });

  const plant = fakePlant();

  const fakeProps = (): DragPlantProps => ({
    getPlant: () => plant,
    mapTransformProps: fakeMapTransformProps(),
    isDragging: true,
    dispatch: jest.fn(),
    setMapState: jest.fn(),
    pageX: 100,
    pageY: 200,
    qPageX: 10,
    qPageY: 20,
  });

  it("moves plant", () => {
    const p = fakeProps();
    dragPlant(p);
    expect(p.setMapState).toHaveBeenCalledWith({
      activeDragXY: { x: 190, y: 380, z: 0 },
      qPageX: 100, qPageY: 200
    });
    expect(movePoint).toHaveBeenCalledWith({
      deltaX: 90, deltaY: 180, gridSize: p.mapTransformProps.gridSize,
      point: p.getPlant()
    });
  });

  it("moves plant while swapped in odd quadrant", () => {
    Object.defineProperty(window, "getComputedStyle", {
      value: () => ({ transform: "scale(0.5)" }), configurable: true
    });
    const p = fakeProps();
    p.mapTransformProps.quadrant = 3;
    p.mapTransformProps.xySwap = true;
    p.qPageX = 500;
    p.qPageY = 3000;
    dragPlant(p);
    expect(p.setMapState).toHaveBeenCalledWith({
      activeDragXY: { x: 700, y: 400, z: 0 },
      qPageX: 200, qPageY: 2900
    });
    expect(movePoint).toHaveBeenCalledWith({
      deltaX: 600, deltaY: 200, gridSize: p.mapTransformProps.gridSize,
      point: p.getPlant()
    });
  });

  it("moves plant: zoom unknown", () => {
    Object.defineProperty(window, "getComputedStyle", {
      value: () => ({ transform: undefined }), configurable: true
    });
    const p = fakeProps();
    dragPlant(p);
    expect(p.setMapState).toHaveBeenCalledWith({
      activeDragXY: { x: 190, y: 380, z: 0 },
      qPageX: 100, qPageY: 200
    });
    expect(movePoint).toHaveBeenCalledWith({
      deltaX: 90, deltaY: 180, gridSize: p.mapTransformProps.gridSize,
      point: p.getPlant()
    });
  });

  it("doesn't move plant: not dragging", () => {
    const p = fakeProps();
    p.isDragging = false;
    dragPlant(p);
    expect(p.setMapState).not.toHaveBeenCalled();
    expect(movePoint).not.toHaveBeenCalled();
  });

  it("moves plant: same location", () => {
    const p = fakeProps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.qPageX = undefined as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.qPageY = undefined as any;
    dragPlant(p);
    expect(p.setMapState).toHaveBeenCalledWith({
      activeDragXY: { x: 100, y: 200, z: 0 },
      qPageX: 100, qPageY: 200
    });
    expect(movePoint).toHaveBeenCalledWith({
      deltaX: 0, deltaY: 0, gridSize: p.mapTransformProps.gridSize,
      point: p.getPlant()
    });
  });
});

describe("jogPoint()", () => {
  const fakeProps = (): JogPointProps => ({
    keyName: "",
    point: undefined,
    mapTransformProps: fakeMapTransformProps(),
    dispatch: jest.fn(),
  });

  it("doesn't move point: no point", () => {
    const p = fakeProps();
    p.keyName = "ArrowLeft";
    p.point = undefined;
    jogPoint(p);
    expect(movePoint).not.toHaveBeenCalled();
  });

  it("doesn't move point: not arrow key", () => {
    const p = fakeProps();
    p.keyName = "Enter";
    p.point = fakePlant();
    jogPoint(p);
    expect(movePoint).not.toHaveBeenCalled();
  });

  it.each<[string, BotOriginQuadrant, boolean, number, number]>([
    ["ArrowLeft", 1, false, 10, 0],
    ["ArrowLeft", 1, true, 0, 10],
    ["ArrowLeft", 2, false, -10, 0],
    ["ArrowLeft", 2, true, 0, -10],
    ["ArrowLeft", 3, false, -10, 0],
    ["ArrowLeft", 3, true, 0, -10],
    ["ArrowLeft", 4, false, 10, 0],
    ["ArrowLeft", 4, true, 0, 10],
    ["ArrowRight", 1, false, -10, 0],
    ["ArrowRight", 1, true, 0, -10],
    ["ArrowRight", 2, false, 10, 0],
    ["ArrowRight", 2, true, 0, 10],
    ["ArrowRight", 3, false, 10, 0],
    ["ArrowRight", 3, true, 0, 10],
    ["ArrowRight", 4, false, -10, 0],
    ["ArrowRight", 4, true, 0, -10],
    ["ArrowDown", 1, false, 0, 10],
    ["ArrowDown", 1, true, 10, 0],
    ["ArrowDown", 2, false, 0, 10],
    ["ArrowDown", 2, true, 10, 0],
    ["ArrowDown", 3, false, 0, -10],
    ["ArrowDown", 3, true, -10, 0],
    ["ArrowDown", 4, false, 0, -10],
    ["ArrowDown", 4, true, -10, 0],
    ["ArrowUp", 1, false, 0, -10],
    ["ArrowUp", 1, true, -10, 0],
    ["ArrowUp", 2, false, 0, -10],
    ["ArrowUp", 2, true, -10, 0],
    ["ArrowUp", 3, false, 0, 10],
    ["ArrowUp", 3, true, 10, 0],
    ["ArrowUp", 4, false, 0, 10],
    ["ArrowUp", 4, true, 10, 0],
  ])("moves point: %s, quadrant: %s, rotated: %s",
    (keyName, quadrant, swap, x, y) => {
      const p = fakeProps();
      p.keyName = keyName;
      p.point = fakePlant();
      p.mapTransformProps.quadrant = quadrant;
      p.mapTransformProps.xySwap = swap;
      jogPoint(p);
      expect(movePoint).toHaveBeenCalledWith({
        deltaX: x,
        deltaY: y,
        point: p.point,
        gridSize: p.mapTransformProps.gridSize,
      });
    });
});

describe("setActiveSpread()", () => {
  const fakeProps = (): SetActiveSpreadProps => ({
    selectedPlant: fakePlant(),
    slug: "mint",
    setMapState: jest.fn(),
  });

  it("sets default spread value", async () => {
    const p = fakeProps();
    p.slug = "potato";
    await setActiveSpread(p);
    expect(p.setMapState).toHaveBeenCalledWith({ activeDragSpread: 25 });
  });

  it("sets crop spread value", async () => {
    const p = fakeProps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.selectedPlant = undefined as any;
    await setActiveSpread(p);
    expect(p.setMapState).toHaveBeenCalledWith({ activeDragSpread: 100 });
  });
});

describe("beginPlantDrag()", () => {
  const fakeProps = (): BeginPlantDragProps => ({
    plant: fakePlant(),
    setMapState: jest.fn(),
    selectedPlant: undefined,
  });

  it("starts drag: plant", () => {
    beginPlantDrag(fakeProps());
    expect(cachedCrop).toHaveBeenCalled();
  });

  it("starts drag: not plant", () => {
    const p = fakeProps();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p.plant = undefined as any;
    beginPlantDrag(p);
    expect(cachedCrop).not.toHaveBeenCalled();
  });
});

describe("maybeSavePlantLocation()", () => {
  const fakeProps = (): MaybeSavePlantLocationProps => ({
    plant: fakePlant(),
    isDragging: true,
    dispatch: jest.fn(),
  });

  it("saves location", () => {
    maybeSavePlantLocation(fakeProps());
    expect(edit).toHaveBeenCalledWith(expect.any(Object),
      { x: 100, y: 200 });
    expect(save).toHaveBeenCalledWith(expect.stringContaining("Point"));
  });

  it("doesn't save location", () => {
    const p = fakeProps();
    p.isDragging = false;
    maybeSavePlantLocation(p);
    expect(edit).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("savePoint()", () => {
  const fakeProps = (): SavePointProps => ({
    point: fakePlant(),
    dispatch: jest.fn(),
  });

  it("saves plant", () => {
    savePoint(fakeProps());
    expect(edit).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith(expect.stringContaining("Point"));
  });

  it("doesn't save plant", () => {
    const p = fakeProps();
    p.point = undefined;
    savePoint(p);
    expect(edit).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
