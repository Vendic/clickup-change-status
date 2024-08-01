// Mocking the github context https://github.com/actions/toolkit/blob/master/docs/github-package.md#mocking-the-github-context
import * as core from '@actions/core';
import run from '../change_status';
import nock from 'nock';

describe('Change Status Action', () => {
    const clickUpApiBase = 'https://api.clickup.com/api/v2/task';
    const teamId = '123';
    const targetStatus = 'approved'; // Status we're trying to set, which should be invalid

    let failedMock: jest.SpyInstance;
    let infoMock: jest.SpyInstance;
    let warningMock: jest.SpyInstance;

    beforeAll(() => {
        process.env['INPUT_CLICKUP_TOKEN'] = 'xyz';
        process.env['INPUT_CLICKUP_CUSTOM_TASK_IDS'] = 'ABC-123\nDEF-123\nNON-123\nZXC-987';
        process.env['INPUT_CLICKUP_TEAM_ID'] = teamId;
        process.env['INPUT_CLICKUP_STATUS'] = targetStatus; // Set to 'approved'
    });

    beforeEach(() => {
        failedMock = jest.spyOn(core, 'setFailed').mockImplementation(jest.fn());
        infoMock = jest.spyOn(core, 'info').mockImplementation(jest.fn());
        warningMock = jest.spyOn(core, 'warning').mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    afterAll(() => {
        delete process.env['GITHUB_REPOSITORY'];
        delete process.env['INPUT_TOKEN'];
    });

    it('successfully changes the status of multiple ClickUp tasks', async () => {
        const validInReviewReply = {
            id: '9hx',
            custom_id: null,
            name: 'Updated Task Name',
            text_content: 'Updated Task Content',
            description: 'Updated Task Content',
            status: {
                status: 'in review', // Assume this is a valid status change
                color: '#d3d3d3',
                orderindex: 1,
                type: 'custom',
            },
        };

        // Mock the ClickUp API for valid status transitions
        nock(clickUpApiBase)
            .get(/\/ABC-123\/\?custom_task_ids=true&team_id=\d+/)
            .reply(200, validInReviewReply)
            .get(/\/DEF-123\/\?custom_task_ids=true&team_id=\d+/)
            .reply(200, validInReviewReply)
            .put(/\/ABC-123\/\?custom_task_ids=true&team_id=\d+/)
            .reply(200, validInReviewReply)
            .put(/\/DEF-123\/\?custom_task_ids=true&team_id=\d+/)
            .reply(200, validInReviewReply);

        await run();

        expect(infoMock).toHaveBeenCalledWith(
            'Changed the status of ABC-123 to in review successfully.'
        );
        expect(infoMock).toHaveBeenCalledWith(
            'Changed the status of DEF-123 to in review successfully.'
        );
    });

    it('handles API failures gracefully', async () => {
        // Mock a failing request
        nock(clickUpApiBase)
            .put(/\/NON-123\/\?custom_task_ids=true&team_id=\d+/)
            .reply(500);

        await run();

        expect(failedMock).toHaveBeenCalledWith(
            'Action failed: One of the API requests has failed. Please check the logs for more details.'
        );
    });

    it('does not change the status from "done" to "approved"', async () => {
        const doneTicketReply = {
            id: '9hx',
            custom_id: null,
            name: 'Task Name',
            text_content: 'Task Content',
            description: 'Task Content',
            status: {
                status: 'done',
                color: '#d3d3d3',
                orderindex: 2,
                type: 'custom',
            },
        };

        // Mock the ClickUp API for the "done" status transition
        nock(clickUpApiBase)
            .get(/\/ZXC-987\/\?custom_task_ids=true&team_id=\d+/)
            .reply(200, doneTicketReply); // Mock a task that is currently "done"

        await run();

        expect(warningMock).toHaveBeenCalledWith(
            'Cannot change the status of ZXC-987 from done to approved. Skipping...'
        );
    });
});
