import * as core from '@actions/core'
import run from '../change_status'
import nock from "nock";

const apiReply = {
    "id": "9hx",
    "custom_id": null,
    "name": "Updated Task Name",
    "text_content": "Updated Task Content",
    "description": "Updated Task Content",
    "status": {
        "status": "in review",
        "color": "#d3d3d3",
        "orderindex": 1,
        "type": "custom"
    }
}

describe('Test happy path', () => {
    it('does a call to the Clickup API', async () => {
        const failedMock = jest.spyOn(core, 'setFailed')
        const infoMock = jest.spyOn(core, 'info')

        nock('https://api.clickup.com')
            .get('/api/v2/task/ABC-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)
        nock('https://api.clickup.com')
            .put('/api/v2/task/ABC-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)
        nock('https://api.clickup.com')
            .get('/api/v2/task/DEF-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)
        nock('https://api.clickup.com')
            .put('/api/v2/task/DEF-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)

        await run()

        expect(infoMock).toHaveBeenCalledWith('Changed the status of ABC-123 to in review successfully.')
        expect(infoMock).toHaveBeenCalledWith('Changed the status of DEF-123 to in review successfully.')
        expect(failedMock).not.toHaveBeenCalled()
    })
})

describe('Test non-existent task', () => {
    it('warns and skips tasks that do not exist in ClickUp', async () => {
        const failedMock = jest.spyOn(core, 'setFailed')
        const warningMock = jest.spyOn(core, 'warning')
        const infoMock = jest.spyOn(core, 'info')

        nock('https://api.clickup.com')
            .get('/api/v2/task/ABC-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)
        nock('https://api.clickup.com')
            .put('/api/v2/task/ABC-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)
        nock('https://api.clickup.com')
            .get('/api/v2/task/NON-123/?custom_task_ids=true&team_id=123')
            .reply(404, { err: 'Task not found' })

        process.env['INPUT_CLICKUP_CUSTOM_TASK_IDS'] = 'ABC-123\nNON-123'
        await run()

        expect(infoMock).toHaveBeenCalledWith('Changed the status of ABC-123 to in review successfully.')
        expect(warningMock).toHaveBeenCalledWith('Task NON-123 not found in ClickUp, skipping.')
        expect(failedMock).not.toHaveBeenCalled()
    })
})

beforeEach(() => {
    jest.resetModules()
    process.env['INPUT_CLICKUP_TOKEN'] = 'xyz'
    process.env['INPUT_CLICKUP_CUSTOM_TASK_IDS'] = 'ABC-123\nDEF-123'
    process.env['INPUT_CLICKUP_TEAM_ID'] = '123'
    process.env['INPUT_CLICKUP_STATUS'] = 'in review'
})

afterEach(() => {
    delete process.env['GITHUB_REPOSITORY']
    delete process.env['INPUT_TOKEN']
    nock.cleanAll()
    jest.restoreAllMocks()
})
