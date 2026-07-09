import { prisma } from "@/lib/prisma";

export async function calculateNextMonthLoanProjection() {
  const loans = await prisma.bankLoan.findMany({
    where: {
      status: "ACTIVE"
    }
  });

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const targetMonth = nextMonth.getMonth() + 1; // 1-12
  const targetYear = nextMonth.getFullYear();

  const projections = loans.map((loan: any) => {
    let principalPayment = 0;
    let interestPayment = 0;

    const remainingPrincipal = loan.remainingPrincipal ?? loan.loanAmount;
    const rate = loan.interestRate || 0; // % per year

    // Calculate interest (1 month)
    interestPayment = (remainingPrincipal * (rate / 100)) / 12;

    // Calculate principal
    if (loan.repaymentMethod === "goc_lai_cuoi_ky") {
      // Only pay principal and interest at maturity
      interestPayment = 0; // reset monthly interest
      if (loan.maturityDate) {
        const matDate = new Date(loan.maturityDate);
        if (matDate.getMonth() + 1 === targetMonth && matDate.getFullYear() === targetYear) {
          principalPayment = remainingPrincipal;
          // Estimate total interest at maturity (if termMonths exists)
          if (loan.termMonths) {
            interestPayment = (loan.loanAmount * (rate / 100)) * (loan.termMonths / 12);
          }
        }
      }
    } else {
      // For goc_deu_lai_giam or tra_deu
      let monthsPassed = 0;
      if (loan.disbursementDate) {
        const disbDate = new Date(loan.disbursementDate);
        monthsPassed = (targetYear - disbDate.getFullYear()) * 12 + (targetMonth - (disbDate.getMonth() + 1));
      }

      if (monthsPassed > (loan.gracePeriodMonths || 0) && loan.termMonths) {
        // If past grace period, pay principal
        const paymentMonths = loan.termMonths - (loan.gracePeriodMonths || 0);
        if (paymentMonths > 0) {
          principalPayment = loan.loanAmount / paymentMonths;
        }
      }
    }
    
    // If paymentFrequency is not monthly, we should adjust.
    if (loan.paymentFrequency === "hang_quy") {
       let monthsPassed = 0;
       if (loan.disbursementDate) {
         const disbDate = new Date(loan.disbursementDate);
         monthsPassed = (targetYear - disbDate.getFullYear()) * 12 + (targetMonth - (disbDate.getMonth() + 1));
       }
       if (monthsPassed % 3 !== 0) {
         principalPayment = 0;
         interestPayment = 0;
       } else {
         principalPayment *= 3;
         interestPayment *= 3;
       }
    } else if (loan.paymentFrequency === "6_thang") {
       let monthsPassed = 0;
       if (loan.disbursementDate) {
         const disbDate = new Date(loan.disbursementDate);
         monthsPassed = (targetYear - disbDate.getFullYear()) * 12 + (targetMonth - (disbDate.getMonth() + 1));
       }
       if (monthsPassed % 6 !== 0) {
         principalPayment = 0;
         interestPayment = 0;
       } else {
         principalPayment *= 6;
         interestPayment *= 6;
       }
    }

    // Ensure principal payment doesn't exceed remaining principal
    if (principalPayment > remainingPrincipal) {
      principalPayment = remainingPrincipal;
    }

    return {
      id: loan.id,
      contractNumber: loan.contractNumber || `BANK-LOAN-${loan.id}`,
      bankName: loan.bankName,
      loanType: loan.loanType,
      repaymentMethod: loan.repaymentMethod,
      remainingPrincipal,
      principalPayment: Math.round(principalPayment),
      interestPayment: Math.round(interestPayment),
      totalPayment: Math.round(principalPayment + interestPayment)
    };
  });

  const activeProjections = projections.filter((p: any) => p.totalPayment > 0);

  return {
    targetMonth,
    targetYear,
    data: activeProjections,
    totalPrincipal: activeProjections.reduce((sum: number, p: any) => sum + p.principalPayment, 0),
    totalInterest: activeProjections.reduce((sum: number, p: any) => sum + p.interestPayment, 0),
    totalPayment: activeProjections.reduce((sum: number, p: any) => sum + p.totalPayment, 0)
  };
}
