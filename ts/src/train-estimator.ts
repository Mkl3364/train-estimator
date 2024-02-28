import { ApiException, DiscountCard, InvalidTripInputException, Passenger, TrainDetails, TripRequest } from "./model/trip.request";

const YOUNG_PASSENGER_PRICE = 9;
const EMPOYEES_PRICE = 1;
export class TrainTicketEstimator {

    getAvailableSeats(trainDetails: TrainDetails): number {
        if (trainDetails.isFull) {
            throw new InvalidTripInputException("Train is full");
        }
        return trainDetails.seats.filter((seat) => seat.isAvailable).length;
    }

    async estimate(trainDetails: TripRequest): Promise<number> {
        const { details, passengers } = trainDetails;

        if (!passengers.length) return 0

        const { from, to, when } = details;

        if (!from.trim().length) throw new InvalidTripInputException("Start city is invalid")

        if (!to.trim().length) throw new InvalidTripInputException("Destination city is invalid");


        if (when < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0)) {
            throw new InvalidTripInputException("Date is invalid");
        }

        const baseTicketPrice = await this.fetchTicketApi(trainDetails);

        const totalbaseTicketPrice = this.calculateTotalPrice(baseTicketPrice, trainDetails);

        return totalbaseTicketPrice;
    }

    private async fetchTicketApi(trainDetails: Pick<TripRequest, 'details'>): Promise<number> {
        const url = `https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`;

        try {
            const request = await fetch(url);
            const response = await request.json();
            return response.price;
        } catch (error) {
            throw new ApiException();
        }
    }

    calculatebaseTicketPrice(passenger: Passenger, baseTicketPrice: number, trainDetails: TripRequest) {
        let calculatedTicketPrice = baseTicketPrice;
        if (passenger.age < 0) {
            throw new InvalidTripInputException("Age is invalid");
        }

        if (passenger.age < 1) {
            throw new InvalidTripInputException("Age is invalid");
        }

        calculatedTicketPrice = this.calculateTicketDependingAge(passenger, baseTicketPrice);

        if (trainDetails.passengers.length == 2) {
            calculatedTicketPrice = this.calculateCoupleDiscount(trainDetails, baseTicketPrice);
        }

        if (trainDetails.passengers.length == 1) {
            calculatedTicketPrice = this.calculateHalfCoupleDiscount(trainDetails, calculatedTicketPrice, baseTicketPrice);
        }


        calculatedTicketPrice = this.calculateDaysDifference(trainDetails, calculatedTicketPrice, baseTicketPrice);

        if (passenger.age > 0 && passenger.age < 4) {
            return YOUNG_PASSENGER_PRICE;
        }

        if (passenger.discounts.includes(DiscountCard.TrainStroke)) {
            return EMPOYEES_PRICE;
        }

        if (passenger.discounts.includes(DiscountCard.Family)) {
            calculatedTicketPrice = this.calculateFamilyDiscount(baseTicketPrice);
        }

        // const familyCardDiscount = this.calculateFamilyCardDiscount(trainDetails.passengers, baseTicketPrice);
        // if (familyCardDiscount) {
        //     calculatedTicketPrice = familyCardDiscount;
        // }

        return calculatedTicketPrice;
    }

    private calculateTicketDependingAge(passenger: Passenger, baseTicketPrice: number) {
        if (passenger.age <= 17) {
            baseTicketPrice = this.calculateMinorDiscount(baseTicketPrice);
        } else if (passenger.age >= 70) {
            baseTicketPrice = this.calculateSeniorDiscount(baseTicketPrice, passenger);
        } else {
            baseTicketPrice = baseTicketPrice * 1.2;
        }
        return baseTicketPrice;
    }

    private calculateFamilyDiscount(baseTicketPrice: number) {
        return baseTicketPrice - (baseTicketPrice * 0.3);
    }

    private calculateDaysDifference(trainDetails: TripRequest, calculatedTicketPrice: number, baseTicketPrice: number) {
        const currentDate = new Date();
        const tripStartDate = trainDetails.details.when;
        const daysDifference = Math.ceil((tripStartDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
        const sixHoursBeforeDeparture = new Date(tripStartDate.getTime() - 6 * 60 * 60 * 1000);

        if (daysDifference >= 30) {
            calculatedTicketPrice -= baseTicketPrice * 0.2;
        }
        else if (daysDifference > 5) {
            calculatedTicketPrice += (20 - daysDifference) * 0.02 * baseTicketPrice;
        }
        else if (daysDifference < 1) {
            if (this.getAvailableSeats(trainDetails.trainDetails) !== 0) {
                if (tripStartDate.getTime() > sixHoursBeforeDeparture.getTime()) {
                    calculatedTicketPrice -= baseTicketPrice * 0.2;
                }
            }
        }
        else {
            calculatedTicketPrice += baseTicketPrice;
        }
        return calculatedTicketPrice;
    }

    private calculateHalfCoupleDiscount(trainDetails: TripRequest, calculatedTicketPrice: number, baseTicketPrice: number) {
        let halfCouple = false;
        let minor = false;
        for (let i = 0; i < trainDetails.passengers.length; i++) {
            if (trainDetails.passengers[i].discounts.includes(DiscountCard.HalfCouple)) {
                halfCouple = true;
            }
            if (trainDetails.passengers[i].age < 18) {
                minor = true;
            }
        }
        if (halfCouple && !minor) {
            calculatedTicketPrice -= baseTicketPrice * 0.1;
        }
        return calculatedTicketPrice;
    }

    private calculateCoupleDiscount(trainDetails: TripRequest, baseTicketPrice: number) {
        let couple = false;
        let minor = false;
        for (let i = 0; i < trainDetails.passengers.length; i++) {
            if (trainDetails.passengers[i].discounts.includes(DiscountCard.Couple)) {
                couple = true;
            }
            if (trainDetails.passengers[i].age < 18) {
                minor = true;
            }
        }
        if (couple && !minor) {
            baseTicketPrice - baseTicketPrice * 0.2;
        }
        return baseTicketPrice;
    }

    private calculateSeniorDiscount(baseTicketPrice: number, passenger: Passenger) {
        const calculatedTicketPrice = baseTicketPrice * 0.8;
        if (passenger.discounts.includes(DiscountCard.Senior)) {
            return (baseTicketPrice * 0.8) - (baseTicketPrice * 0.2);
        }
        return calculatedTicketPrice;
    }

    private calculateMinorDiscount(baseTicketPrice: number) {
        return baseTicketPrice * 0.6;
    }

    calculateFamilyCardDiscount(passengers: Passenger[], baseTicketPrice: number): number | undefined {
        const lastNameSet = new Set<string>();

        for (const passenger of passengers) {
            if (passenger.lastName) {
                if (lastNameSet.has(passenger.lastName)) {
                    return baseTicketPrice - (baseTicketPrice * 0.3);
                }
                lastNameSet.add(passenger.lastName);
            }
        }
    }

    calculateTotalPrice(baseTicketPrice: number, trainDetails: TripRequest) {
        const { passengers } = trainDetails;

        return passengers.reduce((total, passenger) => {
            const unitPriceTicket = this.calculatebaseTicketPrice(passenger, baseTicketPrice, trainDetails);

            return total + unitPriceTicket;
        }, 0)
    }
}
