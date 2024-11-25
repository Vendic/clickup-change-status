import * as core from '@actions/core';
import run from '../change_status';
import nock from 'nock';

describe('Change Status Action', () => {
    const clickUpApiBase = 'https://api.clickup.com/api/v2/task';
    const teamId = '123';
    let targetStatus: string;

    let failedMock: jest.SpyInstance;
    let infoMock: jest.SpyInstance;
    let warningMock: jest.SpyInstance;

    const setEnvVars = (status: string, customTaskIds = 'ABC-123\nDEF-123\nNON-123\nZXC-987') => {
        process.env['INPUT_CLICKUP_STATUS'] = status;
        process.env['INPUT_CLICKUP_CUSTOM_TASK_IDS'] = customTaskIds;
    };

    const mockClickUpApi = (taskId: string, currentStatus: string, targetStatus: string, success = true) => {
        const taskReply = {
            id: taskId,
            custom_id: null,
            name: 'Updated Task Name',
            text_content: 'Updated Task Content',
            description: 'Updated Task Content',
            status: {
                status: currentStatus,
                color: '#d3d3d3',
                orderindex: 1,
                type: 'custom',
            },
        };

        nock(clickUpApiBase)
            .get(new RegExp(`/${taskId}/\\?custom_task_ids=true&team_id=\\d+`))
            .reply(200, taskReply);

        if (success) {
            taskReply.status.status = targetStatus;
            nock(clickUpApiBase)
                .put(new RegExp(`/${taskId}/\\?custom_task_ids=true&team_id=\\d+`))
                .reply(200, taskReply);
        } else {
            nock(clickUpApiBase)
                .put(new RegExp(`/${taskId}/\\?custom_task_ids=true&team_id=\\d+`))
                .reply(500);
        }
    };

    beforeAll(() => {
        process.env['INPUT_CLICKUP_TOKEN'] = 'xyz';
        process.env['INPUT_CLICKUP_TEAM_ID'] = teamId;
    });

    beforeEach(() => {
        targetStatus = 'approved'; // Default target status
        setEnvVars(targetStatus);

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
        targetStatus = 'in review';
        setEnvVars(targetStatus);

        mockClickUpApi('ABC-123', 'open', targetStatus);
        mockClickUpApi('DEF-123', 'open', targetStatus);

        await run();

        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of ABC-123 to ${targetStatus} successfully.`
        );
        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of DEF-123 to ${targetStatus} successfully.`
        );
    });

    it('handles API failures gracefully', async () => {
        mockClickUpApi('NON-123', 'in progress', targetStatus, false);

        await run();

        expect(failedMock).toHaveBeenCalledWith(
            'Action failed: One of the API requests has failed. Please check the logs for more details.'
        );
    });

    it('does not change the status from "done" to "approved"', async () => {
        targetStatus = 'approved';
        setEnvVars(targetStatus);

        mockClickUpApi('ZXC-987', 'done', targetStatus, false);

        await run();

        expect(warningMock).toHaveBeenCalledWith(
            `Cannot change the status of ZXC-987 from done to ${targetStatus}. Skipping...`
        );
    });

    it('does not change the status from "done" to "in progress"', async () => {
        targetStatus = 'in progress';
        setEnvVars(targetStatus);

        mockClickUpApi('ZXC-987', 'done', targetStatus, false);

        await run();

        expect(warningMock).toHaveBeenCalledWith(
            `Cannot change the status of ZXC-987 from done to ${targetStatus}. Skipping...`
        );
    });

    it('changes the status from "done" to "todo"', async () => {
        targetStatus = 'todo';
        setEnvVars(targetStatus, 'ABC-123');

        mockClickUpApi('ABC-123', 'done', targetStatus);

        await run();

        expect(infoMock).toHaveBeenCalledWith(
            `Changed the status of ABC-123 to ${targetStatus} successfully.`
        );
    });
});
