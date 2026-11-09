import { type ErrorCode, SignupRequest, SignupResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { detectCountry, isValidTimeZone, OPEN_MARKETS } from '@tenure/domain'
import { Button, Field, Input, Select } from '@tenure/ui'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../shared/api/client.ts'
import { focusFirst, textOf, useSignIn } from '../api.ts'
import { AuthPage, FormError } from '../AuthPage.tsx'
import styles from '../AuthPage.module.css'

type SignupField = 'gymName' | 'name' | 'email' | 'password' | 'country'
type Errors = Partial<Record<SignupField, string>>

/** The field each code belongs to, from the client's checks or the server's answer. */
const fieldOf: Partial<Record<ErrorCode, SignupField>> = {
  gymName: 'gymName',
  yourName: 'name',
  email: 'email',
  password: 'password',
  passwordTooLong: 'password',
  duplicate: 'email',
  country: 'country',
}

/** The client's own line for each code its checks can find (§16: the same words the server would send). */
const clientLine: Partial<
  Record<
    ErrorCode,
    | 'signup.gymNameRequired'
    | 'signup.nameRequired'
    | 'err.email'
    | 'err.password'
    | 'api.passwordTooLong'
    | 'signup.countryRequired'
  >
> = {
  gymName: 'signup.gymNameRequired',
  yourName: 'signup.nameRequired',
  email: 'err.email',
  password: 'err.password',
  passwordTooLong: 'api.passwordTooLong',
  country: 'signup.countryRequired',
}

/**
 * The checks before sending: the contract's own rules, whose every issue message is an error code. It checks the
 * fields in form order, so the first error found is the first field.
 */
function check(body: SignupRequest): Errors {
  const errors: Errors = {}
  for (const issue of SignupRequest.safeParse(body).error?.issues ?? []) {
    const code = issue.message as ErrorCode
    const field = fieldOf[code]
    const line = clientLine[code]
    if (field && line && errors[field] === undefined) errors[field] = t(line)
  }
  return errors
}

/** The browser's time zone, when it is one the API accepts. */
function browserTimeZone(): { timezone?: string } {
  const timezone: unknown = Intl.DateTimeFormat().resolvedOptions().timeZone
  return isValidTimeZone(timezone) ? { timezone } : {}
}

/** The Country choice's start: the open market the browser's zone is in, else '' for "Choose a country" (FR-AUTH-02). */
const detectedCountry = (): string => detectCountry(browserTimeZone().timezone) ?? ''

const isSignupField = (name: string): name is SignupField => Object.values(fieldOf).includes(name as SignupField)

export default function Signup() {
  const [errors, setErrors] = useState<Errors>({})
  // Fields changed since the last submit: their error lines, the client's or the server's, are gone.
  const [edited, setEdited] = useState<ReadonlySet<SignupField>>(new Set())
  const formRef = useRef<HTMLFormElement>(null)
  const [preset] = useState(detectedCountry)
  const signup = useSignIn<SignupRequest>('/api/auth/signup', SignupResponse)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const body: SignupRequest = {
      gymName: textOf(data, 'gymName'),
      name: textOf(data, 'name'),
      email: textOf(data, 'email'),
      password: textOf(data, 'password'),
      // '' is no choice: the check refuses it, as the server would.
      country: textOf(data, 'country') as SignupRequest['country'],
    }
    const found = check(body)
    setErrors(found)
    setEdited(new Set())
    if (Object.keys(found).length > 0) {
      signup.reset()
      focusFirst(form, found)
      return
    }
    signup.mutate({ ...body, ...browserTimeZone() })
  }

  // A server answer about one field goes under it; anything else goes above the button.
  const failure = signup.error
  const failedField = failure instanceof ApiRequestError && failure.code ? fieldOf[failure.code] : undefined
  const errorFor = (field: SignupField) =>
    edited.has(field) ? undefined : (errors[field] ?? (failedField === field ? failure?.message : undefined))

  // A server answer about one field moves focus to it, so its error (the field's description) is read.
  useEffect(() => {
    if (failedField && formRef.current) focusFirst(formRef.current, { [failedField]: true })
  }, [failure, failedField])

  function onChange(event: FormEvent<HTMLFormElement>) {
    const { name } = event.target as HTMLInputElement
    if (isSignupField(name) && !edited.has(name)) setEdited(new Set([...edited, name]))
  }

  return (
    <AuthPage
      title={t('signup.title')}
      lede={t('signup.lede')}
      other={{ to: '/login', text: t('signup.toLogin'), link: t('signup.toLogin.link') }}
      long
      atTheStall="home"
    >
      <form ref={formRef} className={styles.form} onSubmit={onSubmit} onChange={onChange} noValidate>
        <Field label={t('signup.gymName')} error={errorFor('gymName')}>
          <Input name="gymName" autoComplete="organization" />
        </Field>
        <Field label={t('signup.name')} error={errorFor('name')}>
          <Input name="name" autoComplete="name" />
        </Field>
        <Field label={t('signup.email')} error={errorFor('email')}>
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field label={t('signup.password')} hint={t('signup.passwordHelp')} error={errorFor('password')}>
          <Input name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label={t('signup.country')} error={errorFor('country')}>
          <Select name="country" defaultValue={preset} autoComplete="country">
            {preset === '' && <option value="">{t('signup.countryPick')}</option>}
            {OPEN_MARKETS.map((country) => (
              <option key={country} value={country}>
                {t(`country.${country}`)}
              </option>
            ))}
          </Select>
        </Field>
        <FormError message={failedField ? undefined : failure?.message} submittedAt={signup.submittedAt} />
        <Button className={styles.submit} type="submit" variant="primary" loading={signup.isPending}>
          {signup.isPending ? t('signup.submitting') : t('signup.submit')}
        </Button>
      </form>
    </AuthPage>
  )
}
