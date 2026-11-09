import { LoginRequest, LoginResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, Field, Input } from '@tenure/ui'
import { type FormEvent, useState } from 'react'
import { focusFirst, textOf, useSignIn } from '../api.ts'
import { AuthPage, FormError } from '../AuthPage.tsx'
import styles from '../AuthPage.module.css'

type Errors = Partial<Record<keyof LoginRequest, string>>

/** The checks before sending, in form order. The password's length is the server's to judge: it answers a mismatch. */
function check(body: LoginRequest): Errors {
  const errors: Errors = {}
  if (!LoginRequest.shape.email.safeParse(body.email).success) errors.email = t('err.email')
  if (body.password === '') errors.password = t('login.passwordRequired')
  return errors
}

export default function Login() {
  const [errors, setErrors] = useState<Errors>({})
  const login = useSignIn<LoginRequest>('/api/auth/login', LoginResponse)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const body: LoginRequest = { email: textOf(data, 'email'), password: textOf(data, 'password') }
    const found = check(body)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      login.reset()
      focusFirst(form, found)
      return
    }
    login.mutate(body)
  }

  // Changing a field clears its line; the line above the button stays until the next submit.
  function onChange(event: FormEvent<HTMLFormElement>) {
    const { name } = event.target as HTMLInputElement
    if (name !== 'email' && name !== 'password') return
    setErrors((current) => {
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  return (
    <AuthPage
      title={t('login.title')}
      other={{ to: '/signup', text: t('login.toSignup'), link: t('login.toSignup.link') }}
      atTheStall="demo"
    >
      <form className={styles.form} onSubmit={onSubmit} onChange={onChange} noValidate>
        <Field label={t('login.email')} error={errors.email}>
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field label={t('login.password')} error={errors.password}>
          <Input name="password" type="password" autoComplete="current-password" />
        </Field>
        <FormError message={login.error?.message} submittedAt={login.submittedAt} />
        <Button className={styles.submit} type="submit" variant="primary" loading={login.isPending}>
          {login.isPending ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </AuthPage>
  )
}
