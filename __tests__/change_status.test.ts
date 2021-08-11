// Mocking the github context https://github.com/actions/toolkit/blob/master/docs/github-package.md#mocking-the-github-context

import * as core from '@actions/core'
import run from '../change_status'
import nock from "nock";

describe('Test happy path', () => {
    it('does a call to the Clickup API', async () => {
        // Mocks
        const failedMock = jest.spyOn(core, 'setFailed')
        const infoMock = jest.spyOn(core, 'info')
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
        nock('https://api.clickup.com')
            .persist()
            .put('/api/v2/task/ABC-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)
        nock('https://api.clickup.com')
            .persist()
            .put('/api/v2/task/DEF-123/?custom_task_ids=true&team_id=123')
            .reply(200, apiReply)



        await run()

        // Assertions
        expect(infoMock).toHaveBeenCalledWith('Changed the status of ABC-123 to in review successfully.')
        expect(infoMock).toHaveBeenCalledWith('Changed the status of DEF-123 to in review successfully.')
        expect(failedMock).toHaveBeenCalledWith('Action failed: One of the API requests has failed. Please check the logs for more details.')
    })
})

beforeEach(() => {
    jest.resetModules()
    process.env['INPUT_CLICKUP_TOKEN'] = 'xyz'
    process.env['INPUT_CLICKUP_CUSTOM_TASK_IDS'] = 'ABC-123\nDEF-123\nNON-123'
    process.env['INPUT_CLICKUP_TEAM_ID'] = '123'
    process.env['INPUT_CLICKUP_STATUS'] = 'in review'
})

afterEach(() => {
    delete process.env['GITHUB_REPOSITORY']
    delete process.env['INPUT_TOKEN']
})
