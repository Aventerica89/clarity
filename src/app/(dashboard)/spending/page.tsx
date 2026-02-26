"use client"

import { PageTabs } from "@/components/ui/page-tabs"
import { TransactionList } from "@/components/spending/transaction-list"
import { RecurringTab } from "@/components/spending/recurring-tab"
import { AnalyticsStub } from "@/components/spending/analytics-stub"
import { AccountsStub } from "@/components/spending/accounts-stub"

export default function SpendingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Spending</h1>

      <PageTabs
        tabs={[
          {
            value: "transactions",
            label: "Transactions",
            content: <TransactionList />,
          },
          {
            value: "recurring",
            label: "Recurring",
            content: <RecurringTab />,
          },
          {
            value: "analytics",
            label: "Analytics",
            content: <AnalyticsStub />,
          },
          {
            value: "accounts",
            label: "Accounts",
            content: <AccountsStub />,
          },
        ]}
      />
    </div>
  )
}
