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
})
