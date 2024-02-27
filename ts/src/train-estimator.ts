import {
	ApiException,
	DiscountCard,
	InvalidTripInputException,
	TripRequest,
} from "./model/trip.request";

export class TrainTicketEstimator {
	async estimate(trainDetails: TripRequest): Promise<number> {
		if (trainDetails.passengers.length === 0) {
			return 0;
		}

		if (trainDetails.details.from.trim().length === 0) {
			throw new InvalidTripInputException("Start city is invalid");
		}

		if (trainDetails.details.to.trim().length === 0) {
			throw new InvalidTripInputException("Destination city is invalid");
		}

		if (
			trainDetails.details.when <
			new Date(
				new Date().getFullYear(),
				new Date().getMonth(),
				new Date().getDate(),
				0,
				0,
				0
			)
		) {
			throw new InvalidTripInputException("Date is invalid");
		}

		// TODO USE THIS LINE AT THE END
		const basePrice =
			(
				await (
					await fetch(
						`https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`
					)
				).json()
			)?.price || -1;

		if (basePrice === -1) {
			throw new ApiException();
		}

		const passengers = trainDetails.passengers;
		let totalPrice = 0;
		let passengerPrice = basePrice;
		for (let i = 0; i < passengers.length; i++) {
			if (passengers[i].age < 0) {
				throw new InvalidTripInputException("Age is invalid");
			}
			if (passengers[i].age < 1) {
				continue;
			}
			// Seniors
			else if (passengers[i].age <= 17) {
				passengerPrice = basePrice * 0.6;
			} else if (passengers[i].age >= 70) {
				passengerPrice = basePrice * 0.8;
				if (passengers[i].discounts.includes(DiscountCard.Senior)) {
					passengerPrice -= basePrice * 0.2;
				}
			} else {
				passengerPrice = basePrice * 1.2;
			}

			const d = new Date();
			if (trainDetails.details.when.getTime() >= d.setDate(d.getDate() + 30)) {
				passengerPrice -= basePrice * 0.2;
			} else if (
				trainDetails.details.when.getTime() > d.setDate(d.getDate() - 30 + 5)
			) {
				const date1 = trainDetails.details.when;
				const date2 = new Date();
				//https://stackoverflow.com/questions/43735678/typescript-get-difference-between-two-dates-in-days
				const diff = Math.abs(date1.getTime() - date2.getTime());
				const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

				passengerPrice += (20 - diffDays) * 0.02 * basePrice; // I tried. it works. I don't know why.
			} else {
				passengerPrice += basePrice;
			}

			if (passengers[i].age > 0 && passengers[i].age < 4) {
				passengerPrice = 9;
			}

			if (passengers[i].discounts.includes(DiscountCard.TrainStroke)) {
				passengerPrice = 1;
			}

			totalPrice += passengerPrice;
			passengerPrice = basePrice;
		}

		if (passengers.length == 2) {
			let cp = false;
			let mn = false;
			for (let i = 0; i < passengers.length; i++) {
				if (passengers[i].discounts.includes(DiscountCard.Couple)) {
					cp = true;
				}
				if (passengers[i].age < 18) {
					mn = true;
				}
			}
			if (cp && !mn) {
				totalPrice -= basePrice * 0.2 * 2;
			}
		}

		if (passengers.length == 1) {
			let cp = false;
			let mn = false;
			for (let i = 0; i < passengers.length; i++) {
				if (passengers[i].discounts.includes(DiscountCard.HalfCouple)) {
					cp = true;
				}
				if (passengers[i].age < 18) {
					mn = true;
				}
			}
			if (cp && !mn) {
				totalPrice -= basePrice * 0.1;
			}
		}

		return totalPrice;
	}
}
