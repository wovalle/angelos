import { createMock } from "ts-jest-mock";
import { Logger } from "tslog";

const MockLogger = createMock(Logger);

export const getMockLogger = () => new MockLogger();
