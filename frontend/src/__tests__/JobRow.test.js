import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import JobRow from '@/components/JobRow.vue'

function mountJobRow(props = {}) {
  return mount(JobRow, {
    props: {
      job: {
        id: 200,
        name: 'build',
        status: 'completed',
        conclusion: 'success',
        duration: '1m 30s',
        runnerName: 'ubuntu-latest',
        htmlUrl: 'https://github.com/org/repo/actions/runs/100/job/200',
        ...props.job,
      },
      last: props.last || false,
    },
    global: {
      plugins: [createTestVuetify()],
    },
  })
}

describe('JobRow', () => {
  it('displays job name', () => {
    const wrapper = mountJobRow()
    expect(wrapper.text()).toContain('build')
  })

  it('displays duration when present', () => {
    const wrapper = mountJobRow()
    expect(wrapper.text()).toContain('1m 30s')
  })

  it('hides duration when null', () => {
    const wrapper = mountJobRow({ job: { duration: null } })
    expect(wrapper.text()).not.toContain('1m 30s')
  })

  it('displays runner name when present', () => {
    const wrapper = mountJobRow()
    expect(wrapper.text()).toContain('ubuntu-latest')
  })

  it('hides runner name when null', () => {
    const wrapper = mountJobRow({ job: { runnerName: null } })
    expect(wrapper.text()).not.toContain('ubuntu-latest')
  })

  it('renders external link when htmlUrl present', () => {
    const wrapper = mountJobRow()
    const link = wrapper.find('[target="_blank"]')
    expect(link.exists()).toBe(true)
  })

  it('hides external link when no htmlUrl', () => {
    const wrapper = mountJobRow({ job: { htmlUrl: null } })
    const links = wrapper.findAll('[target="_blank"]')
    expect(links.length).toBe(0)
  })

  it('adds border class when not last', () => {
    const wrapper = mountJobRow({ last: false })
    expect(wrapper.find('.job-row--border').exists()).toBe(true)
  })

  it('omits border class when last', () => {
    const wrapper = mountJobRow({ last: true })
    expect(wrapper.find('.job-row--border').exists()).toBe(false)
  })

  it('displays billable minutes for Linux jobs', () => {
    const wrapper = mountJobRow({ job: { billableMinutes: 5, runnerOs: 'linux' } })
    expect(wrapper.text()).toContain('5 min')
    expect(wrapper.text()).toContain('Linux 1x')
  })

  it('displays billable minutes for macOS jobs', () => {
    const wrapper = mountJobRow({ job: { billableMinutes: 20, runnerOs: 'macos' } })
    expect(wrapper.text()).toContain('20 min')
    expect(wrapper.text()).toContain('macOS 10x')
  })

  it('displays self-hosted instead of minutes', () => {
    const wrapper = mountJobRow({ job: { billableMinutes: 0, runnerOs: 'self-hosted' } })
    expect(wrapper.text()).toContain('self-hosted')
    expect(wrapper.text()).not.toContain('0 min')
  })

  it('hides billable minutes when null', () => {
    const wrapper = mountJobRow({ job: { billableMinutes: null, runnerOs: null } })
    expect(wrapper.text()).not.toContain('min')
    expect(wrapper.text()).not.toContain('self-hosted')
  })

  it('has tooltip on duration', () => {
    const wrapper = mountJobRow()
    const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
    const texts = tooltips.map(t => t.props('text'))
    expect(texts).toContain('Elapsed time')
  })

  it('has tooltip on billable minutes', () => {
    const wrapper = mountJobRow({ job: { billableMinutes: 5, runnerOs: 'linux' } })
    const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
    const texts = tooltips.map(t => t.props('text'))
    expect(texts).toContain('Billable minutes')
  })

  it('has tooltip on runner name', () => {
    const wrapper = mountJobRow()
    const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
    const texts = tooltips.map(t => t.props('text'))
    expect(texts).toContain('Runner')
  })

  it('has tooltip on GitHub link', () => {
    const wrapper = mountJobRow()
    const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
    const texts = tooltips.map(t => t.props('text'))
    expect(texts).toContain('View on GitHub')
  })
})
