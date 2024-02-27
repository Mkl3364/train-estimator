import {ApiException, DiscountCard, InvalidTripInputException, TripRequest} from "./model/trip.request";

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

        if (trainDetails.details.when < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0)) {
            throw new InvalidTripInputException("Date is invalid");
        }

        // TODO USE THIS LINE AT THE END
        const basePrice = (await(await fetch(`https://sncftrenitaliadb.com/api/train/estimate/price?from=${trainDetails.details.from}&to=${trainDetails.details.to}&date=${trainDetails.details.when}`)).json())?.price || -1;


        if (basePrice === -1) {
            throw new ApiException();
        }

        const passenger = trainDetails.passengers;
        let tot = 0;
        let tmp = basePrice;
        for (let i=0;i<passenger.length;i++) {

            if (passenger[i].age < 0) {
                throw new InvalidTripInputException("Age is invalid");
            }
            if (passenger[i].age < 1) {
                continue;
            }
            // Seniors
            else if (passenger[i].age <= 17) {
            tmp = basePrice* 0.6;
            } else if(passenger[i].age >= 70) {
                tmp = basePrice * 0.8;
                if (passenger[i].discounts.includes(DiscountCard.Senior)) {
                    tmp -= basePrice * 0.2;
                }
            } else {
                tmp = basePrice*1.2;
            }

            const d = new Date();
            if (trainDetails.details.when.getTime() >= d.setDate(d.getDate() +30)) {
                tmp -= basePrice * 0.2;
            } else if (trainDetails.details.when.getTime() > d.setDate(d.getDate() -30 + 5)) {
                const date1 = trainDetails.details.when;
                const date2 = new Date();
                //https://stackoverflow.com/questions/43735678/typescript-get-difference-between-two-dates-in-days
                var diff = Math.abs(date1.getTime() - date2.getTime());
                var diffDays = Math.ceil(diff / (1000 * 3600 * 24));

                tmp += (20 - diffDays) * 0.02 * basePrice; // I tried. it works. I don't know why.
            } else {
                tmp += basePrice;
            }

            if (passenger[i].age > 0 && passenger[i].age < 4) {
                tmp = 9;
            }

            if (passenger[i].discounts.includes(DiscountCard.TrainStroke)) {
                tmp = 1;
            }

            tot += tmp;
            tmp = basePrice;
        }

        if (passenger.length == 2) {
            let cp = false;
            let mn = false;
            for (let i=0;i<passenger.length;i++) {
                if (passenger[i].discounts.includes(DiscountCard.Couple)) {
                    cp = true;
                }
                if (passenger[i].age < 18) {
                    mn = true;
                }
            }
            if (cp && !mn) {
                tot -= basePrice * 0.2 * 2;
            }
        }

        if (passenger.length == 1) {
            let cp = false;
            let mn = false;
            for (let i=0;i<passenger.length;i++) {
                if (passenger[i].discounts.includes(DiscountCard.HalfCouple)) {
                    cp = true;
                }
                if (passenger[i].age < 18) {
                    mn = true;
                }
            }
            if (cp && !mn) {
                tot -= basePrice * 0.1;
            }
        }

        return tot;
    }
}