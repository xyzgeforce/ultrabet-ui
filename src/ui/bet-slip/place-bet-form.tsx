'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
// @ts-ignore
import { useFormState, useFormStatus } from 'react-dom'
import styles from '@/ui/bet-slip/bet-slip.module.css'
import globals from '@/ui/globals.module.css'
import React, { useEffect, useState } from 'react'
import { BetSlipOption, Slip } from '@/ui/bet-slip/bet-slip'
import { Bet, MarketOption } from '@/gql/types.generated'
import { RemoveSlipOptionForm } from '@/ui/bet-slip/remove-slip-option-form'
import { useRouter } from 'next/navigation'

export type CreatedBets = {
  singles: Bet[]
  long?: Bet[]
}

type Props = {
  slip: Slip
}

function SubmitButton({
  onClick,
}: {
  onClick: (e: { preventDefault: () => void; stopPropagation: () => void }) => void
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type={'submit'}
      aria-disabled={pending}
      className={`${globals.button} ${globals.primary}`}
      onClick={onClick}
    >
      Place bet
    </button>
  )
}

const initialState = {
  message: null,
}

function getLongBetName(length: number) {
  const names = new Map([
    [2, 'Double'],
    [3, 'Treble'],
    [4, 'Fourfold'],
    [5, 'Fivefold'],
    [6, 'Sixfold'],
    [7, 'Sevenfold'],
    [8, 'Eightfold'],
    [9, 'Ninefold'],
    [10, 'Tenfold'],
  ])
  return names.get(length) ?? `${length}-fold`
}

export function PlaceBetForm({ slip }: Props) {
  const [slipWithStakes, setSlipWithStakes] = useState<Slip>(slip)
  const optionIds = Object.keys(slip)
  const [longOption, setLongOption] = useState<BetSlipOption | null>(null)
  const [createdBetsCount, setCreatedBetsCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const ids = Object.keys(slip)
    setLongOption({
      odds: ids.map((optionId) => slip[optionId]).reduce((acc, o) => acc * o.odds, 1),
      marketName: '',
      eventName: '',
      id: 'long',
      name: getLongBetName(ids.length),
      stake: 0,
    })
  }, [slip])

  useEffect(() => {
    // update slipWithStakes when slip changes
    const newSlipWithStakes = Object.keys(slip).reduce((acc, optionId) => {
      const option = slip[optionId]
      return { ...acc, [optionId]: { ...option, stake: slipWithStakes[optionId]?.stake ?? 0 } }
    }, slipWithStakes)

    if (Object.keys(newSlipWithStakes).length !== Object.keys(slipWithStakes).length) {
      setSlipWithStakes(newSlipWithStakes)
    }
  }, [slip, slipWithStakes])

  const { user } = useUser()
  const placeBet = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault()
    e.stopPropagation()

    fetch('/api/slip', {
      method: 'POST',
      body: JSON.stringify({ singles: slipWithStakes, long: longOption }),
    }).then(async (response) => {
      if (response.ok) {
        const bets = await response.json()
        const count = bets.data.singles.length + (bets.data.long ? 1 : 0)
        router.refresh()
        setCreatedBetsCount(count)

        setTimeout(() => {
          setCreatedBetsCount(0)
        }, 3000)
      }
    })
  }

  function getStake(slip: Slip, optionId: string) {
    const option = slip[optionId]
    return option?.stake ?? 0
  }

  function setStake(slip: Slip, option: BetSlipOption, stake: number): void {
    if (option.id === 'long') {
      return setLongOption({ ...option, stake })
    }
    setSlipWithStakes({ ...slip, [option.id]: { ...option, stake } })
  }

  function renderOption(
    option: MarketOption & { stake?: number; marketName: string; eventName: string }
  ) {
    if (!option) return null
    return (
      <li key={option.id} className={styles.option}>
        <div className={styles.header}>
          <div className={styles.name}>
            <div>{option.name}</div>
            <div>{option.odds.toFixed(2)}</div>
          </div>
        </div>
        <div className={styles.content}>
          <div>{option.marketName}</div>
          <div>{option.eventName}</div>
        </div>
        <input
          className={styles.stake}
          type="number"
          name={`${option.id}-stake`}
          id={`${option.id}-stake`}
          min={0}
          step={1}
          placeholder="Enter stake"
          required
          value={option.id === 'long' ? longOption?.stake : getStake(slipWithStakes, option.id)}
          onChange={(e) => {
            setStake(slipWithStakes, option, parseFloat(e.target.value))
          }}
        />
      </li>
    )
  }

  if (createdBetsCount > 0) {
    return (
      <p>
        {createdBetsCount} bet {createdBetsCount > 1 ? 's were' : 'was'} placed!
      </p>
    )
  }

  return (
    <>
      <ol className={styles.column}>
        {Object.keys(slip)
          .map((optionIdStr) => slip[optionIdStr])
          .map((option) => (
            <li key={option.id} className={styles.option}>
              <div className={styles.header}>
                <RemoveSlipOptionForm option={option} />
              </div>
            </li>
          ))}
      </ol>
      <form className={styles.betForm}>
        <ol className={`${styles.right} ${styles.column}`}>
          {optionIds.map((optionIdStr) => slipWithStakes[optionIdStr]).map(renderOption)}
          {optionIds.length > 1 && longOption && renderOption(longOption)}
        </ol>
        {optionIds.length > 0 ? (
          <div className={styles.actions}>
            <SubmitButton onClick={placeBet} />
          </div>
        ) : (
          'Click on the odds boxes to add one or more bets to your slip'
        )}
      </form>
    </>
  )
}
