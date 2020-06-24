import * as React from "react";
import { TileReadPin } from "../tile_read_pin";
import { mount } from "enzyme";
import { fakeSequence } from "../../../__test_support__/fake_state/resources";
import { ReadPin } from "farmbot/dist";
import { emptyState } from "../../../resources/reducer";
import { StepParams } from "../../interfaces";

describe("<TileReadPin/>", () => {
  const fakeProps = (): StepParams => {
    const currentStep: ReadPin = {
      kind: "read_pin",
      args: {
        pin_number: 3,
        label: "pinlabel",
        pin_mode: 1
      }
    };
    return {
      currentSequence: fakeSequence(),
      currentStep: currentStep,
      dispatch: jest.fn(),
      index: 0,
      resources: emptyState().index,
      confirmStepDeletion: false,
    };
  };

  it("renders inputs", () => {
    const block = mount(<TileReadPin {...fakeProps()} />);
    const inputs = block.find("input");
    const labels = block.find("label");
    const buttons = block.find("button");
    expect(inputs.length).toEqual(2);
    expect(labels.length).toEqual(3);
    expect(buttons.length).toEqual(2);
    expect(inputs.first().props().placeholder).toEqual("Read Sensor");
    expect(labels.at(0).text()).toEqual("sensor or peripheral");
    expect(labels.at(1).text()).toEqual("Mode");
    expect(labels.at(2).text()).toEqual("Data Label");
    expect(inputs.at(1).props().value).toEqual("pinlabel");
    expect(buttons.at(0).text()).toEqual("Pin 3");
  });
});
