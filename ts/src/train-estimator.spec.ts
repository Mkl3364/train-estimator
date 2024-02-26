import { ApiException, DiscountCard, TripRequest } from "./model/trip.request";
import { TrainTicketEstimator } from "./train-estimator";

describe("train estimator", function () {
	it("should work", () => {
		expect(1 + 2).toBe(3);
	});
});

describe("TrainTicketEstimator", () => {
	const PRICE = 100;
	const THIRTY_DAYS_DISCOUNT = 0.2;
	const SEVENTY_YEARS_DISCOUNT = 0.8;
	const HEIGHTEEN_YEARS_DISCOUNT = 0.6;
	const SENIOR_DISCOUNT = 0.2;
	const FIFTY_YEARS_INCREASE = 1.2;
	const futureDateFortyDay = new Date();
	futureDateFortyDay.setDate(futureDateFortyDay.getDate() + 40);
	const futureDateTwentyDay = new Date();
	futureDateTwentyDay.setDate(futureDateTwentyDay.getDate() + 20);
	const futureDateFiveDay = new Date();
	futureDateFiveDay.setDate(futureDateFiveDay.getDate() + 4);

	global.fetch = jest.fn().mockResolvedValue({
		json: () => Promise.resolve({ price: PRICE }),
	});

	let estimator: TrainTicketEstimator;

	beforeEach(() => {
		estimator = new TrainTicketEstimator();
	});

	it("estimate returns 0 when no passengers", async () => {
		const tripDetails: TripRequest = {
			passengers: [],
			details: { from: "Paris", to: "Lyon", when: new Date() },
		};

		const result = await estimator.estimate(tripDetails);

		expect(result).toBe(0);
	});

	it("throw error when start city is invalid", () => {
		const tripDetails: TripRequest = {
			passengers: [{ age: 25, discounts: [] }],
			details: { from: "", to: "Lyon", when: new Date() },
		};
		expect(estimator.estimate(tripDetails)).rejects.toThrow(
			"Start city is invalid"
		);
	});

	it("estimate throws error when destination city is invalid", async () => {
		const tripDetails: TripRequest = {
			passengers: [{ age: 25, discounts: [] }],
			details: { from: "Paris", to: "", when: new Date() },
		};

		await expect(estimator.estimate(tripDetails)).rejects.toThrow(
			"Destination city is invalid"
		);
	});

	it("estimate throws error when date is invalid", async () => {
		const invalidDate = new Date(
			new Date().getFullYear(),
			new Date().getMonth(),
			new Date().getDate(),
			0,
			0,
			0
		);
		invalidDate.setDate(invalidDate.getDate() - 1);

		const tripDetails: TripRequest = {
			passengers: [{ age: 25, discounts: [] }],
			details: { from: "Paris", to: "Lyon", when: invalidDate },
		};

		await expect(estimator.estimate(tripDetails)).rejects.toThrow(
			"Date is invalid"
		);
	});

	it("estimate throws ApiException() when API call fails", async () => {
		const fetchMock = jest.fn().mockRejectedValue(new ApiException());

		const trainDetails: TripRequest = {
			passengers: [{ age: 25, discounts: [] }],
			details: { from: "Paris", to: "Lyon", when: new Date() },
		};

		expect(
			async () =>
				await fetchMock(
					`https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`
				)
		).rejects.toEqual(new ApiException());
	});

	it("Should throw error if passenger age is invalid", async () => {
		const tripRequest: TripRequest = {
			passengers: [{ age: -1, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: new Date(),
			},
		};

		await expect(estimator.estimate(tripRequest)).rejects.toThrow(
			"Age is invalid"
		);
	});

	it("should apply 40% for passengers below 18 years old before 30days", async () => {
		const expectedResult = Math.round(
			(HEIGHTEEN_YEARS_DISCOUNT - THIRTY_DAYS_DISCOUNT) * PRICE
		);
		const tripRequest: TripRequest = {
			passengers: [{ age: 16, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};
		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(expectedResult);
	});

	it("should apply 20% for passengers above 70 years old before 30days", async () => {
		const expectedResult = Math.round(
			(SEVENTY_YEARS_DISCOUNT - THIRTY_DAYS_DISCOUNT) * PRICE
		);
		const tripRequest: TripRequest = {
			passengers: [{ age: 71, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};
		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(expectedResult);
	});

	it("should apply 20% for passengers above 70 years old before 30days with senior card discount", async () => {
		const priceAfterDiscount = Math.round(
			(SEVENTY_YEARS_DISCOUNT - SENIOR_DISCOUNT - THIRTY_DAYS_DISCOUNT) * PRICE
		);
		const tripRequest: TripRequest = {
			passengers: [{ age: 71, discounts: [DiscountCard.Senior] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};
		const priceToPay = await estimator.estimate(tripRequest);

		expect(priceToPay).toBe(priceAfterDiscount);
	});

	it("should apply +20% for passengers between 18years old and 70 years old before 30days", async () => {
		const priceAfterIncrease = Math.round(
			(FIFTY_YEARS_INCREASE - THIRTY_DAYS_DISCOUNT) * PRICE
		);
		const tripRequest: TripRequest = {
			passengers: [{ age: 50, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};
		const priceToPay = await estimator.estimate(tripRequest);

		expect(priceToPay).toBe(priceAfterIncrease);
	});

	it('should apply a unique price of 9 euros for passengers below 4 years old', async () => {
		const tripRequest: TripRequest = {
			passengers: [{ age: 3, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: new Date(),
			},
		};
		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(9);
	})

	it("Train date is 30 days or more in the future", async () => {
		const futurePrice = Math.round(
			(FIFTY_YEARS_INCREASE - THIRTY_DAYS_DISCOUNT) * PRICE
		);
		const tripRequest: TripRequest = {
			passengers: [{ age: 30, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};

		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(futurePrice);
	});

	it("Train ticket date is between 5 and 30 days (20 days)", async () => {
		const tripRequest: TripRequest = {
			passengers: [{ age: 30, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};

		const ticketDate = tripRequest.details.when;
		ticketDate.setDate(ticketDate.getDate() + 20);
		const currentDate = new Date();

		const diff = Math.abs(ticketDate.getTime() - currentDate.getTime());
		const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

		let ticketPrice;

		if (diffDays >= 5 && diffDays <= 29) {
			// Apply 2% daily increase for 25 days
			ticketPrice = PRICE * Math.pow(1.02, 25);
		} else if (diffDays === 30) {
			// Apply -18% increase for the 29th day
			ticketPrice = PRICE * 0.82;
		} else if (diffDays === 4) {
			// Apply +30% increase for the 5th day
			ticketPrice = PRICE * 1.30;
		} else {
			// Default calculation if outside the specified range
			ticketPrice = PRICE;
		}

		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(ticketPrice);
	});

	it("Train date is 5days or less in the future", async () => {
		const futurPrice = Math.round((1 + FIFTY_YEARS_INCREASE) * PRICE);
		const tripRequest: TripRequest = {
			passengers: [{ age: 30, discounts: [] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: new Date(),
			},
		};
		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(futurPrice);
	});

	it("should apply a unique price of 1 euro for passengers with a TrainStroke card", async () => {
		const tripRequest: TripRequest = {
			passengers: [{ age: 30, discounts: [DiscountCard.TrainStroke] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: new Date(),
			},
		};

		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(1);
	});

	it('should apply 20% discount for each passengers in couple and adult', async () => {
		const totalPriceFor2Tickets = 200;
		const tripRequest: TripRequest = {
			passengers: [{ age: 25, discounts: [] }, { age: 30, discounts: [DiscountCard.Couple] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};

		const ticketPrice = totalPriceFor2Tickets - (PRICE * 0.2 * 2);

		const result = await estimator.estimate(tripRequest);

		expect(result).toBe(ticketPrice);
	})

	it('should apply 10 % discount for the half couple card', async () => {
		const tripRequest: TripRequest = {
			passengers: [{ age: 30, discounts: [DiscountCard.HalfCouple] }],
			details: {
				from: "Paris",
				to: "Lyon",
				when: futureDateFortyDay,
			},
		};
		const priceAfterDiscount = PRICE - (PRICE * 0.10);
		const result = await estimator.estimate(tripRequest);
		expect(result).toBe(priceAfterDiscount);
	})
});

