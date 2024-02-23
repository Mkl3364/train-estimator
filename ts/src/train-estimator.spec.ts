import { TripRequest } from "./model/trip.request";
import { TrainTicketEstimator } from "./train-estimator";

describe("train estimator", function () {
    it("should work", () => {
        expect(1 + 2).toBe(3);
    });
});


describe('create an object from TrainEstimator class', () => {

})

describe('TrainTicketEstimator', () => {
    let estimator: TrainTicketEstimator;

    beforeEach(() => {
        estimator = new TrainTicketEstimator();
    });

    it('estimate returns 0 when no passengers', async () => {
        const tripDetails: TripRequest = {
            passengers: [],
            details: { from: 'Paris', to: 'Lyon', when: new Date() }
        };

        const result = await estimator.estimate(tripDetails);

        expect(result).toBe(0);
    });

});